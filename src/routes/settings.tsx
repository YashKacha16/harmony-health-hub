import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDB } from "@/lib/useStore";
import { settingsService } from "@/services/settingsService";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — MediCore HMS" }, { name: "description", content: "Configure departments, charges, and medicine categories." }] }),
  component: () => (
    <RequireAuth roles={["Admin"]}>
      <AppShell><SettingsPage /></AppShell>
    </RequireAuth>
  ),
});

function SettingsPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground">Configure the values used across the application.</p>
        </div>
        <Link to="/employees"><Button variant="outline"><Users className="h-4 w-4 mr-2" /> Manage employees</Button></Link>
      </div>
      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="charges">Charges</TabsTrigger>
          <TabsTrigger value="categories">Medicine categories</TabsTrigger>
        </TabsList>
        <TabsContent value="departments" className="mt-4"><Departments /></TabsContent>
        <TabsContent value="charges" className="mt-4"><Charges /></TabsContent>
        <TabsContent value="categories" className="mt-4"><Categories /></TabsContent>
      </Tabs>
    </div>
  );
}

function Departments() {
  const db = useDB();
  const [name, setName] = useState("");
  const add = async () => { if (!name) return; await settingsService.addDepartment(name); setName(""); toast.success("Department added"); };
  return (
    <Card className="shadow-[var(--shadow-card)]"><CardContent className="p-5 space-y-4">
      <div className="flex gap-2"><Input placeholder="New department name" value={name} onChange={(e) => setName(e.target.value)} /><Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {db.departments.map((d) => (
              <TableRow key={d.id}>
                <TableCell><Input defaultValue={d.name} onBlur={(e) => settingsService.updateDepartment(d.id, e.target.value)} /></TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={async () => { await settingsService.removeDepartment(d.id); toast.success("Removed"); }}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardContent></Card>
  );
}

function Charges() {
  const db = useDB();
  const [name, setName] = useState("");
  const [amt, setAmt] = useState("");
  const add = async () => { if (!name) return; await settingsService.addCharge(name, Number(amt) || 0); setName(""); setAmt(""); toast.success("Charge added"); };
  return (
    <Card className="shadow-[var(--shadow-card)]"><CardContent className="p-5 space-y-4">
      <div className="grid sm:grid-cols-[1fr_180px_auto] gap-2">
        <Input placeholder="Charge name (e.g. OPD Charge)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Amount" type="number" value={amt} onChange={(e) => setAmt(e.target.value)} />
        <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Amount</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {db.charges.map((c) => (
              <TableRow key={c.id}>
                <TableCell><Input defaultValue={c.name} onBlur={(e) => settingsService.updateCharge(c.id, { name: e.target.value })} /></TableCell>
                <TableCell><Input type="number" defaultValue={c.amount} onBlur={(e) => settingsService.updateCharge(c.id, { amount: Number(e.target.value) || 0 })} /></TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={async () => { await settingsService.removeCharge(c.id); toast.success("Removed"); }}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardContent></Card>
  );
}

function Categories() {
  const db = useDB();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [pieces, setPieces] = useState("");
  const add = async () => {
    if (!name || !unit) return toast.error("Name and unit required");
    await settingsService.addCategory({ name, unit, piecesPerUnit: pieces ? Number(pieces) : 1 });
    setName(""); setUnit(""); setPieces("");
    toast.success("Category added");
  };
  return (
    <Card className="shadow-[var(--shadow-card)]"><CardContent className="p-5 space-y-4">
      <div className="grid sm:grid-cols-[1fr_1fr_160px_auto] gap-2">
        <div className="space-y-1"><Label className="text-xs">Name</Label><Input placeholder="e.g. Tablet" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Unit</Label><Input placeholder="Strip / Bottle / Piece" value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Pieces per unit</Label><Input type="number" placeholder="10" value={pieces} onChange={(e) => setPieces(e.target.value)} /></div>
        <div className="flex items-end"><Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Unit</TableHead><TableHead>Pieces / unit</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {db.categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell><Input defaultValue={c.name} onBlur={(e) => settingsService.updateCategory(c.id, { name: e.target.value })} /></TableCell>
                <TableCell><Input defaultValue={c.unit} onBlur={(e) => settingsService.updateCategory(c.id, { unit: e.target.value })} /></TableCell>
                <TableCell><Input type="number" defaultValue={c.piecesPerUnit || 1} onBlur={(e) => settingsService.updateCategory(c.id, { piecesPerUnit: Number(e.target.value) || 1 })} /></TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={async () => { await settingsService.removeCategory(c.id); toast.success("Removed"); }}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardContent></Card>
  );
}
