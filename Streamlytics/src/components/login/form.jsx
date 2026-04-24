import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [mode, setMode] = useState("login"); // login | register

  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [orgId, setOrgId] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const url =
      mode === "login"
        ? "http://localhost:8000/login"
        : "http://localhost:8000/register";

    const body =
      mode === "login"
        ? { account, password }
        : { account, password, org_id: orgId };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
      window.location.href = "/";
    } else {
      alert(data.detail || "Auth failed");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border p-6 bg-white/80 backdrop-blur"
    >
      <h1 className="text-2xl font-bold text-center">Streamlytics</h1>

      <Input
        placeholder="Account"
        value={account}
        onChange={(e) => setAccount(e.target.value)}
      />

      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {/* ONLY for register */}
      {mode === "register" && (
        <Input
          placeholder="Org ID"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
        />
      )}

      <Button type="submit">
        {mode === "login" ? "Login" : "Create Account"}
      </Button>

      <div className="text-sm text-center text-muted-foreground">
        {mode === "login" ? (
          <>
            No account?{" "}
            <button
              type="button"
              className="underline"
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              className="underline"
              onClick={() => setMode("login")}
            >
              Login
            </button>
          </>
        )}
      </div>
    </form>
  );
}