import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("API access controls and validation", () => {
  it("returns a consistent validation envelope for invalid login input", async () => {
    const response = await request(app).post("/api/auth/login").send({});

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Please check the highlighted fields." },
    });
    expect(response.body.error.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "email" }),
      expect.objectContaining({ field: "password" }),
    ]));
  });

  it("rejects mutation requests from an untrusted origin", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Origin", "https://untrusted.example")
      .send({ email: "buyer@example.com", password: "Password123!" });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "FORBIDDEN", message: "Request origin is not allowed." },
    });
  });

  it.each(["/api/admin/stats", "/api/conversations"]) (
    "requires authentication for %s",
    async (path) => {
      const response = await request(app).get(path);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        error: { code: "UNAUTHORIZED" },
      });
    },
  );
});
