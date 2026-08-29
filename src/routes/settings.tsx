import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDB } from "@/lib/useStore";
import { settingsService } from "@/services/settingsService";
import { RolePermissionsTab } from "@/components/RolePermissionsTab";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Lifecare Hospital" }, { name: "description", content: "Configure departments, charges, and medicine categories." }] }),
  component: () => (
    <RequireAuth module="Settings" action="Access">
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
          <TabsTrigger value="wards">IPD Wards</TabsTrigger>
          <TabsTrigger value="hospital">Hospital Info</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
        </TabsList>
        <TabsContent value="departments" className="mt-4"><Departments /></TabsContent>
        <TabsContent value="charges" className="mt-4"><Charges /></TabsContent>
        <TabsContent value="categories" className="mt-4"><Categories /></TabsContent>
        <TabsContent value="wards" className="mt-4"><IpdWards /></TabsContent>
        <TabsContent value="hospital" className="mt-4"><HospitalSettings /></TabsContent>
        <TabsContent value="roles" className="mt-4"><RolePermissionsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function Departments() {
  const db = useDB();
  const [name, setName] = useState("");

  useEffect(() => {
    settingsService.listDepartments();
  }, []);

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
  
  useEffect(() => {
    settingsService.listCharges();
  }, []);

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

  useEffect(() => {
    settingsService.listCategories();
  }, []);

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
        <div className="space-y-1">
          <Label className="text-xs">Unit</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Strip">Strip</SelectItem>
              <SelectItem value="Bottle">Bottle</SelectItem>
              <SelectItem value="Piece">Piece</SelectItem>
            </SelectContent>
          </Select>
        </div>
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

function HospitalSettings() {
  const db = useDB();
  const [helpline, setHelpline] = useState(db.hospitalSettings?.helpline || "");
  const [address, setAddress] = useState(db.hospitalSettings?.address || "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(db.hospitalSettings?.logoUrl || "");
  const [isUploading, setIsUploading] = useState(false);

  const handleSave = async () => {
    setIsUploading(true);
    let finalLogoUrl = db.hospitalSettings?.logoUrl || "";
    try {
      if (logoFile) {
        finalLogoUrl = await settingsService.uploadLogo(logoFile);
      }
      settingsService.updateHospitalSettings({ helpline, address, logoUrl: finalLogoUrl });
      toast.success("Hospital settings updated successfully.");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="p-5 space-y-4 max-w-2xl">
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm">Helpline Number(s)</Label>
            <Input 
              placeholder="e.g. 93 74 108 108 / 8000 8111" 
              value={helpline} 
              onChange={(e) => setHelpline(e.target.value)} 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Hospital Address</Label>
            <Input 
              placeholder="e.g. Vijardiya, Gujarat" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Logo Upload</Label>
            <Input 
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setLogoFile(file);
                  setLogoPreview(URL.createObjectURL(file));
                }
              }} 
            />
            {logoPreview && (
              <div className="mt-2">
                <img 
                  src={logoPreview} 
                  alt="Logo Preview" 
                  className="h-16 object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  onLoad={(e) => { e.currentTarget.style.display = 'block'; }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">This logo will be displayed on printed prescriptions and bills.</p>
          </div>
          <Button onClick={handleSave} disabled={isUploading}>
            {isUploading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function IpdWards() {
  const db = useDB();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    settingsService.listIpdWards();
  }, []);
  
  const add = async () => { if (!name) return; await settingsService.addIpdWard(name, Number(price) || 0); setName(""); setPrice(""); toast.success("Ward added"); };
  return (
    <Card className="shadow-[var(--shadow-card)]"><CardContent className="p-5 space-y-4">
      <div className="grid sm:grid-cols-[1fr_180px_auto] gap-2">
        <Input placeholder="Ward name (e.g. General Ward)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Price / day" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Price / Day</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {db.ipdWards?.map((w) => (
              <TableRow key={w.id}>
                <TableCell><Input defaultValue={w.name} onBlur={(e) => settingsService.updateIpdWard(w.id, { name: e.target.value })} /></TableCell>
                <TableCell><Input type="number" defaultValue={w.pricePerDay} onBlur={(e) => settingsService.updateIpdWard(w.id, { pricePerDay: Number(e.target.value) || 0 })} /></TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={async () => { await settingsService.removeIpdWard(w.id); toast.success("Removed"); }}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardContent></Card>
  );
}
