import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import { useAuthStore } from "../../../hooks/useAuthStore";

function renderGuarded(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/projects" element={<div>projects-page</div>} />
        </Route>
        <Route path="/login" element={<div>login-page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuthStore.getState().clearAuth();
});

describe("projects route guard", () => {
  it("redirects an unauthenticated user to login", () => {
    renderGuarded("/projects");
    expect(screen.getByText("login-page")).toBeInTheDocument();
  });

  it("renders the page when authenticated", () => {
    useAuthStore.getState().setAuth({
      id: "u1",
      email: "u@x.io",
      isSuperuser: false,
      roleId: null,
      emailVerified: true,
      permissions: [],
    });
    renderGuarded("/projects");
    expect(screen.getByText("projects-page")).toBeInTheDocument();
  });
});
