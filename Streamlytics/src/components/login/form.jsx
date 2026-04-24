import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    console.log("Login:", { account, password });

    // TODO: replace with JWT logic later
  };

  return (
    <form
      onSubmit={handleLogin}
      className="flex flex-col gap-5 rounded-xl border p-6 shadow-sm bg-white/80 backdrop-blur"
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold">Streamlytics</h1>
        <p className="text-sm text-gray-500">Real-time data platform</p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Account</label>
        <Input
          type="account"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Password</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <Button type="submit" className="w-full">
        Login
      </Button>
    </form>
  );
}
