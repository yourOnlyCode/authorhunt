import { describe, expect, it } from "vitest";
import { trustMeter, type TrustFacts } from "@/lib/studio/trust-meter";

const empty: TrustFacts = { portraitUrl: null, bio: "", tagline: "", genres: [], city: "", aiUse: null, website: "", links: [], readersOf: [], work: null };
const full: TrustFacts = {
  portraitUrl: "/p.jpg", bio: "I write.", tagline: "Stories.", genres: ["poetry"], city: "Leeds", aiUse: "none", website: "https://a.example", links: [{ url: "https://b.example" }], readersOf: ["mary-oliver"],
  work: { hasCover: true, description: "About it.", excerpt: "It began.", buyLinks: [{ url: "https://c.example" }], note: "Hello." },
};

describe("the trust meter", () => {
  it("starts at nothing and reaches exactly a hundred when everything is there", () => {
    expect(trustMeter(empty).score).toBe(0);
    expect(trustMeter(full).score).toBe(100);
    expect(trustMeter(full).next).toBeNull();
    expect(trustMeter(empty).items.reduce((n, i) => n + i.points, 0)).toBe(100);
  });
  it("counts a portrait for most, and offers it first", () => {
    const m = trustMeter(empty);
    expect(m.next?.key).toBe("portrait");
    expect(Math.max(...m.items.map((i) => i.points))).toBe(m.items.find((i) => i.key === "portrait")!.points);
    expect(trustMeter({ ...empty, portraitUrl: "/p.jpg" }).score).toBe(25);
  });
  it("doesn't count blank text or an empty link", () => {
    expect(trustMeter({ ...empty, bio: "   ", links: [{ url: " " }], work: { hasCover: false, description: " ", excerpt: "\n", buyLinks: [{ url: "" }], note: "" } }).score).toBe(0);
  });
  it("counts a sample of the work, and either a website or a link for being findable", () => {
    expect(trustMeter({ ...empty, work: { hasCover: false, description: "", excerpt: "It began.", buyLinks: [], note: "" } }).score).toBe(10);
    expect(trustMeter({ ...empty, website: "https://a.example" }).score).toBe(5);
    expect(trustMeter({ ...empty, website: "https://a.example", links: [{ url: "https://b.example" }] }).score).toBe(5);
  });
  it("is high without a portrait, but never full", () => {
    expect(trustMeter({ ...full, portraitUrl: null }).score).toBe(75);
  });
});
