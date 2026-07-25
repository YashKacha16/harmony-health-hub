import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Stethoscope, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — MediCore HMS" },
      { name: "description", content: "Sign in to the hospital management system." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("aisha@hms.local");
  const [password, setPassword] = useState("admin123");
  const [show, setShow] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/" }); }, [user, navigate]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = login(email, password);
    if (r.ok) { toast.success("Welcome back"); navigate({ to: "/" }); }
    else toast.error(r.error || "Login failed");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-primary to-info text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/15 backdrop-blur">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="font-semibold text-lg">MediCore HMS</div>
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="text-4xl font-semibold leading-tight">Care that runs on clarity.</h1>
          <p className="text-primary-foreground/80">
            One workspace for reception, OPD, pharmacy, and staff — designed for teams that
            can't afford friction.
          </p>
        </div>
        <div className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} MediCore</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md shadow-[var(--shadow-elevated)]">
          <CardContent className="p-8">
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Use your staff credentials to continue.
            </p>
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw">Password</Label>
                <div className="relative">
                  <Input id="pw" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-2 grid place-items-center text-muted-foreground">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full">Sign in</Button>
            </form>
            <div className="mt-6 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <div className="font-medium text-foreground">Demo accounts</div>
              <div>Admin — aisha@hms.local / admin123</div>
              <div>Doctor — ravi@hms.local / doctor123</div>
              <div>Receptionist — priya@hms.local / recep123</div>
              <div>Pharmacist — sanjay@hms.local / pharm123</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
