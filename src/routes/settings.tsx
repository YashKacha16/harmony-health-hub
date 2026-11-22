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
  useEffect(() => {
    settingsService.getHospitalSettings();
  }, []);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Settings</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Configure the values used across the application.</p>
        </div>
        <Link to="/employees" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            <Users className="h-4 w-4 mr-2" /> Manage employees
          </Button>
        </Link>
      </div>
      <Tabs defaultValue="departments" className="w-full">
        <div className="w-full overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          <TabsList className="inline-flex w-max sm:w-auto h-9 sm:h-10 p-1 bg-muted/60">
            <TabsTrigger value="departments" className="text-xs sm:text-sm px-2.5 sm:px-3">Departments</TabsTrigger>
            <TabsTrigger value="charges" className="text-xs sm:text-sm px-2.5 sm:px-3">Charges</TabsTrigger>
            <TabsTrigger value="categories" className="text-xs sm:text-sm px-2.5 sm:px-3">Medicine categories</TabsTrigger>
            <TabsTrigger value="wards" className="text-xs sm:text-sm px-2.5 sm:px-3">IPD Wards</TabsTrigger>
            <TabsTrigger value="hospital" className="text-xs sm:text-sm px-2.5 sm:px-3">Hospital Info</TabsTrigger>
            <TabsTrigger value="roles" className="text-xs sm:text-sm px-2.5 sm:px-3">Roles & Permissions</TabsTrigger>
          </TabsList>
        </div>
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
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="p-3.5 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input 
            placeholder="New department name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="flex-1"
          />
          <Button onClick={add} className="w-full sm:w-auto shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {db.departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-6 text-muted-foreground text-sm">
                    No departments added yet.
                  </TableCell>
                </TableRow>
              ) : (
                db.departments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell><Input defaultValue={d.name} onBlur={(e) => settingsService.updateDepartment(d.id, e.target.value)} /></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={async () => { await settingsService.removeDepartment(d.id); toast.success("Removed"); }}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile List View */}
        <div className="space-y-2.5 sm:hidden">
          {db.departments.length === 0 ? (
            <div className="p-4 text-center rounded-lg border border-dashed text-xs text-muted-foreground">
              No departments added yet.
            </div>
          ) : (
            db.departments.map((d) => (
              <div key={d.id} className="flex items-center gap-2 p-2.5 rounded-lg border bg-card/60">
                <Input 
                  defaultValue={d.name} 
                  onBlur={(e) => settingsService.updateDepartment(d.id, e.target.value)} 
                  className="flex-1 text-sm h-9" 
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10" 
                  onClick={async () => { await settingsService.removeDepartment(d.id); toast.success("Removed"); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Charges() {
  const db = useDB();
  const [name, setName] = useState("");
  const [amt, setAmt] = useState("");
  const [category, setCategory] = useState("Hospital Bill");
  
  useEffect(() => {
    settingsService.listCharges();
  }, []);

  const add = async () => { if (!name) return; await settingsService.addCharge(name, Number(amt) || 0, category); setName(""); setAmt(""); setCategory("Hospital Bill"); toast.success("Charge added"); };
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="p-3.5 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_160px_auto] gap-2">
          <Input placeholder="Charge name (e.g. OPD Charge)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Amount" type="number" value={amt} onChange={(e) => setAmt(e.target.value)} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Hospital Bill">Hospital Bill</SelectItem>
              <SelectItem value="Lab Bill">Lab Bill</SelectItem>
              <SelectItem value="Reception Charge">Reception Charge</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={add} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Amount</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {db.charges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                    No charges added yet.
                  </TableCell>
                </TableRow>
              ) : (
                db.charges.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell><Input defaultValue={c.name} onBlur={(e) => settingsService.updateCharge(c.id, { name: e.target.value })} /></TableCell>
                    <TableCell><Input type="number" defaultValue={c.amount} onBlur={(e) => settingsService.updateCharge(c.id, { amount: Number(e.target.value) || 0 })} /></TableCell>
                    <TableCell>
                      <Select defaultValue={c.category || "Hospital Bill"} onValueChange={(val) => settingsService.updateCharge(c.id, { category: val })}>
                        <SelectTrigger className="border-0 bg-transparent h-8 shadow-none focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hospital Bill">Hospital Bill</SelectItem>
                          <SelectItem value="Lab Bill">Lab Bill</SelectItem>
                          <SelectItem value="Reception Charge">Reception Charge</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={async () => { await settingsService.removeCharge(c.id); toast.success("Removed"); }}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="space-y-3 md:hidden">
          {db.charges.length === 0 ? (
            <div className="p-4 text-center rounded-lg border border-dashed text-xs text-muted-foreground">
              No charges added yet.
            </div>
          ) : (
            db.charges.map((c) => (
              <div key={c.id} className="p-3 rounded-lg border bg-card/60 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Charge Item</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                    onClick={async () => { await settingsService.removeCharge(c.id); toast.success("Removed"); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Charge Name</Label>
                  <Input 
                    defaultValue={c.name} 
                    onBlur={(e) => settingsService.updateCharge(c.id, { name: e.target.value })} 
                    className="text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Amount (₹)</Label>
                    <Input 
                      type="number" 
                      defaultValue={c.amount} 
                      onBlur={(e) => settingsService.updateCharge(c.id, { amount: Number(e.target.value) || 0 })} 
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <Select defaultValue={c.category || "Hospital Bill"} onValueChange={(val) => settingsService.updateCharge(c.id, { category: val })}>
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hospital Bill">Hospital Bill</SelectItem>
                        <SelectItem value="Lab Bill">Lab Bill</SelectItem>
                        <SelectItem value="Reception Charge">Reception Charge</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
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
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="p-3.5 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px_auto] gap-2">
          <div className="space-y-1"><Label className="text-xs">Category Name</Label><Input placeholder="e.g. Tablet" value={name} onChange={(e) => setName(e.target.value)} /></div>
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
          <div className="flex items-end"><Button onClick={add} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Unit</TableHead><TableHead>Pieces / unit</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {db.categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                    No categories added yet.
                  </TableCell>
                </TableRow>
              ) : (
                db.categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell><Input defaultValue={c.name} onBlur={(e) => settingsService.updateCategory(c.id, { name: e.target.value })} /></TableCell>
                    <TableCell><Input defaultValue={c.unit} onBlur={(e) => settingsService.updateCategory(c.id, { unit: e.target.value })} /></TableCell>
                    <TableCell><Input type="number" defaultValue={c.piecesPerUnit || 1} onBlur={(e) => settingsService.updateCategory(c.id, { piecesPerUnit: Number(e.target.value) || 1 })} /></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={async () => { await settingsService.removeCategory(c.id); toast.success("Removed"); }}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="space-y-3 md:hidden">
          {db.categories.length === 0 ? (
            <div className="p-4 text-center rounded-lg border border-dashed text-xs text-muted-foreground">
              No categories added yet.
            </div>
          ) : (
            db.categories.map((c) => (
              <div key={c.id} className="p-3 rounded-lg border bg-card/60 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category Item</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                    onClick={async () => { await settingsService.removeCategory(c.id); toast.success("Removed"); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input 
                    defaultValue={c.name} 
                    onBlur={(e) => settingsService.updateCategory(c.id, { name: e.target.value })} 
                    className="text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Unit</Label>
                    <Input 
                      defaultValue={c.unit} 
                      onBlur={(e) => settingsService.updateCategory(c.id, { unit: e.target.value })} 
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Pieces / Unit</Label>
                    <Input 
                      type="number" 
                      defaultValue={c.piecesPerUnit || 1} 
                      onBlur={(e) => settingsService.updateCategory(c.id, { piecesPerUnit: Number(e.target.value) || 1 })} 
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HospitalSettings() {
  const db = useDB();
  const [helpline, setHelpline] = useState(db.hospitalSettings?.helpline || "");
  const [address, setAddress] = useState(db.hospitalSettings?.address || "");
  const [followUpValidityMonths, setFollowUpValidityMonths] = useState(db.hospitalSettings?.followUpValidityMonths?.toString() || "3");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(db.hospitalSettings?.logoUrl || "/lifecare-logo.jpg");
  const [isUploading, setIsUploading] = useState(false);
  
  const [bankAccountName, setBankAccountName] = useState(db.hospitalSettings?.bankAccountName || "");
  const [bankAccountNumber, setBankAccountNumber] = useState(db.hospitalSettings?.bankAccountNumber || "");
  const [bankName, setBankName] = useState(db.hospitalSettings?.bankName || "");
  const [bankIfscCode, setBankIfscCode] = useState(db.hospitalSettings?.bankIfscCode || "");

  useEffect(() => {
    settingsService.getHospitalSettings().then((s) => {
      if (s) {
        if (s.helpline) setHelpline(s.helpline);
        if (s.address) setAddress(s.address);
        if (s.followUpValidityMonths) setFollowUpValidityMonths(s.followUpValidityMonths.toString());
        if (s.bankAccountName) setBankAccountName(s.bankAccountName);
        if (s.bankAccountNumber) setBankAccountNumber(s.bankAccountNumber);
        if (s.bankName) setBankName(s.bankName);
        if (s.bankIfscCode) setBankIfscCode(s.bankIfscCode);
        if (s.logoUrl) setLogoPreview(s.logoUrl);
      }
    });
  }, []);

  useEffect(() => {
    if (db.hospitalSettings) {
      if (db.hospitalSettings.helpline) setHelpline(db.hospitalSettings.helpline);
      if (db.hospitalSettings.address) setAddress(db.hospitalSettings.address);
      if (db.hospitalSettings.followUpValidityMonths) setFollowUpValidityMonths(db.hospitalSettings.followUpValidityMonths.toString());
      if (db.hospitalSettings.bankAccountName) setBankAccountName(db.hospitalSettings.bankAccountName);
      if (db.hospitalSettings.bankAccountNumber) setBankAccountNumber(db.hospitalSettings.bankAccountNumber);
      if (db.hospitalSettings.bankName) setBankName(db.hospitalSettings.bankName);
      if (db.hospitalSettings.bankIfscCode) setBankIfscCode(db.hospitalSettings.bankIfscCode);
      if (db.hospitalSettings.logoUrl) setLogoPreview(db.hospitalSettings.logoUrl);
    }
  }, [db.hospitalSettings]);

  const handleSave = async () => {
    setIsUploading(true);
    let finalLogoUrl = db.hospitalSettings?.logoUrl || "/lifecare-logo.jpg";
    try {
      if (logoFile) {
        finalLogoUrl = await settingsService.uploadLogo(logoFile);
      }
      await settingsService.updateHospitalSettings({ 
        helpline, 
        address, 
        logoUrl: finalLogoUrl, 
        followUpValidityMonths: Number(followUpValidityMonths) || 3,
        bankAccountName,
        bankAccountNumber,
        bankName,
        bankIfscCode
      });
      toast.success("Hospital settings updated successfully.");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="p-3.5 sm:p-5 space-y-4 max-w-2xl">
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs sm:text-sm">Helpline Number(s)</Label>
            <Input 
              placeholder="e.g. 93 74 108 108 / 8000 8111" 
              value={helpline} 
              onChange={(e) => setHelpline(e.target.value)} 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs sm:text-sm">Hospital Address</Label>
            <Input 
              placeholder="e.g. Vijardiya, Gujarat" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs sm:text-sm">Follow-up Validity (Months)</Label>
            <Input 
              type="number"
              placeholder="e.g. 3" 
              value={followUpValidityMonths} 
              onChange={(e) => setFollowUpValidityMonths(e.target.value)} 
            />
            <p className="text-xs text-muted-foreground mt-1">Number of months after visit that a patient is eligible for follow-up.</p>
          </div>
          
          <div className="pt-4 border-t space-y-3 sm:space-y-4">
            <h3 className="font-semibold text-sm text-primary">Bank Details (For Invoices/Receipts)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Account Name</Label>
                <Input 
                  placeholder="e.g. Shyam Rajani" 
                  value={bankAccountName} 
                  onChange={(e) => setBankAccountName(e.target.value)} 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Account Number</Label>
                <Input 
                  placeholder="e.g. 20444583179" 
                  value={bankAccountNumber} 
                  onChange={(e) => setBankAccountNumber(e.target.value)} 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Bank Name</Label>
                <Input 
                  placeholder="e.g. SBI BANK" 
                  value={bankName} 
                  onChange={(e) => setBankName(e.target.value)} 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">IFSC Code</Label>
                <Input 
                  placeholder="e.g. SBIN0000463" 
                  value={bankIfscCode} 
                  onChange={(e) => setBankIfscCode(e.target.value)} 
                />
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t space-y-1">
            <Label className="text-xs sm:text-sm">Logo Upload</Label>
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
              <div className="mt-2 p-2 rounded-md border bg-muted/20 w-fit">
                <img 
                  src={logoPreview} 
                  alt="Logo Preview" 
                  className="h-14 sm:h-16 object-contain"
                  onError={(e) => { 
                    if (!e.currentTarget.src.includes('lifecare-logo.jpg')) {
                      e.currentTarget.src = '/lifecare-logo.jpg';
                    }
                  }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">This logo will be displayed on printed prescriptions and bills.</p>
          </div>
          <Button onClick={handleSave} disabled={isUploading} className="w-full sm:w-auto">
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
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="p-3.5 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2">
          <Input placeholder="Ward name (e.g. General Ward)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Price / day" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Button onClick={add} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Price / Day</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {(!db.ipdWards || db.ipdWards.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">
                    No IPD wards added yet.
                  </TableCell>
                </TableRow>
              ) : (
                db.ipdWards.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell><Input defaultValue={w.name} onBlur={(e) => settingsService.updateIpdWard(w.id, { name: e.target.value })} /></TableCell>
                    <TableCell><Input type="number" defaultValue={w.pricePerDay} onBlur={(e) => settingsService.updateIpdWard(w.id, { pricePerDay: Number(e.target.value) || 0 })} /></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={async () => { await settingsService.removeIpdWard(w.id); toast.success("Removed"); }}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="space-y-3 md:hidden">
          {(!db.ipdWards || db.ipdWards.length === 0) ? (
            <div className="p-4 text-center rounded-lg border border-dashed text-xs text-muted-foreground">
              No IPD wards added yet.
            </div>
          ) : (
            db.ipdWards.map((w) => (
              <div key={w.id} className="p-3 rounded-lg border bg-card/60 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ward Item</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                    onClick={async () => { await settingsService.removeIpdWard(w.id); toast.success("Removed"); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Ward Name</Label>
                  <Input 
                    defaultValue={w.name} 
                    onBlur={(e) => settingsService.updateIpdWard(w.id, { name: e.target.value })} 
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Price / Day (₹)</Label>
                  <Input 
                    type="number" 
                    defaultValue={w.pricePerDay} 
                    onBlur={(e) => settingsService.updateIpdWard(w.id, { pricePerDay: Number(e.target.value) || 0 })} 
                    className="text-sm"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
