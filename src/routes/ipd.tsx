import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RoleGuard";
import { useDB } from "@/lib/useStore";
import { useEffect, useState } from "react";
import { receptionService } from "@/services/receptionService";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Patient } from "@/lib/store";

export const Route = createFileRoute("/ipd")({
  head: () => ({
    meta: [
      { title: "IPD Dashboard — Lifecare Hospital" },
      { name: "description", content: "In-Patient Department management." },
    ],
  }),
  component: () => (
    <RequireAuth module="OPD" action="Access">
      <AppShell>
        <IpdPage />
      </AppShell>
    </RequireAuth>
  ),
});

function StatusBadge({ status }: { status: Patient["status"] }) {
  const map: Record<Patient["status"], string> = {
    Waiting: "bg-warning text-warning-foreground",
    "In Consultation": "bg-info text-info-foreground",
    Completed: "bg-success text-success-foreground",
  };
  return <Badge className={map[status]}>{status}</Badge>;
}

function IpdPage() {
  const db = useDB();
  const [q, setQ] = useState("");

  useEffect(() => {
    receptionService.listPatients();
  }, []);

  const ipdPatients = db.patients.filter(
    (p) =>
      p.type === "IPD" &&
      (!q ||
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.code.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">IPD Patients</h2>
        <p className="text-sm text-muted-foreground">List of all admitted in-patients.</p>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="p-5 space-y-4">
          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by patient code or name..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Age/Gender</TableHead>
                  <TableHead>Ward</TableHead>
                  <TableHead>Ward Number</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ipdPatients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No IPD patients yet — register from Reception.
                    </TableCell>
                  </TableRow>
                )}
                {ipdPatients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      {p.age} / {p.gender}
                    </TableCell>
                    <TableCell>{p.ward || "—"}</TableCell>
                    <TableCell>{p.wardNumber || "—"}</TableCell>
                    <TableCell>{p.doctor}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(p.registeredAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
