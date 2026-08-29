import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, ClipboardList, Stethoscope, Pill, AlertTriangle, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RoleGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDB } from "@/lib/useStore";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Lifecare Hospital" },
      { name: "description", content: "Live overview of patients, prescriptions, and pharmacy stock." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <RequireAuth>
      <AppShell>
        <Dashboard />
      </AppShell>
    </RequireAuth>
  );
}

function isToday(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return d.toDateString() === n.toDateString();
}

function Dashboard() {
  const db = useDB();
  const patientsToday = db.patients.filter((p) => isToday(p.registeredAt));
  const opd = patientsToday.filter((p) => p.type === "OPD").length;
  const ipd = patientsToday.filter((p) => p.type === "IPD").length;
  const prescriptionsToday = db.prescriptions.filter((p) => isToday(p.createdAt)).length;
  const lowStock = db.medicines.filter((m) => m.quantity <= 10);
  const nearExpiry = db.medicines.filter((m) => {
    const days = (new Date(m.expDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days < 90 && days > 0;
  });

  const stats = [
    { label: "Patients Today", value: patientsToday.length, icon: Users, tone: "bg-info/10 text-info" },
    { label: "OPD Today", value: opd, icon: Stethoscope, tone: "bg-primary/10 text-primary" },
    { label: "IPD Today", value: ipd, icon: ClipboardList, tone: "bg-accent text-accent-foreground" },
    { label: "Prescriptions", value: prescriptionsToday, icon: TrendingUp, tone: "bg-success/10 text-success" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Good day 👋</h2>
          <p className="text-sm text-muted-foreground">Here's what's happening across the hospital right now.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/reception"><Button>Register patient</Button></Link>
          <Link to="/opd"><Button variant="secondary">Open OPD queue</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-[var(--shadow-card)]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</span>
                <span className={`grid h-9 w-9 place-items-center rounded-lg ${s.tone}`}>
                  <s.icon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-3 text-3xl font-semibold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="shadow-[var(--shadow-card)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Low stock</h3>
              <Link to="/medical"><Button variant="ghost" size="sm">View all</Button></Link>
            </div>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">All medicines are well stocked.</p>
            ) : (
              <ul className="divide-y">
                {lowStock.slice(0, 5).map((m) => (
                  <li key={m.id} className="py-2 flex items-center justify-between">
                    <span className="text-sm">{m.name}</span>
                    <Badge variant="destructive">{m.quantity} left</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2"><Pill className="h-4 w-4 text-info" /> Near expiry</h3>
              <Link to="/medical"><Button variant="ghost" size="sm">View all</Button></Link>
            </div>
            {nearExpiry.length === 0 ? (
              <p className="text-sm text-muted-foreground">No medicines expiring within 90 days.</p>
            ) : (
              <ul className="divide-y">
                {nearExpiry.slice(0, 5).map((m) => (
                  <li key={m.id} className="py-2 flex items-center justify-between">
                    <span className="text-sm">{m.name}</span>
                    <Badge className="bg-warning text-warning-foreground">Exp {m.expDate}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
