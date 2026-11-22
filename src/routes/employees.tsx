import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Pencil, Plus, Search, Trash2, Eye, EyeOff, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useDB } from "@/lib/useStore";
import { employeeService } from "@/services/employeeService";
import { settingsService } from "@/services/settingsService";
import type { Employee, Role } from "@/lib/store";

export const Route = createFileRoute("/employees")({
  head: () => ({ meta: [{ title: "Employees — Lifecare Hospital" }, { name: "description", content: "Manage hospital staff, roles, and access." }] }),
  component: () => (
    <RequireAuth module="Employees" action="Access">
      <AppShell><EmployeesPage /></AppShell>
    </RequireAuth>
  ),
});

const ROLES: Role[] = ["Admin", "Doctor", "Nurse", "Receptionist", "Pharmacist"];

interface Draft {
  id?: string;
  name: string; email: string; password: string; confirm: string;
  phone: string; department: string; role: Role; joiningDate: string;
  address: string; photo?: string; active: boolean;
}

const emptyDraft = (dept: string): Draft => ({
  name: "", email: "", password: "", confirm: "", phone: "", department: dept,
  role: "Doctor", joiningDate: new Date().toISOString().slice(0, 10), address: "", active: true,
});

function EmployeesPage() {
  const db = useDB();

  useEffect(() => {
    employeeService.list();
    settingsService.listDepartments();
  }, []);

  const [q, setQ] = useState("");
  const [roleF, setRoleF] = useState<string>("all");
  const [deptF, setDeptF] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft(db.departments[0]?.name || ""));
  const [showPw, setShowPw] = useState(false);

  const filtered = useMemo(() => {
    return db.employees.filter((e) => {
      const matchesQ = !q || `${e.name} ${e.email} ${e.code}`.toLowerCase().includes(q.toLowerCase());
      const matchesR = roleF === "all" || e.role === roleF;
      const matchesD = deptF === "all" || e.department === deptF;
      return matchesQ && matchesR && matchesD;
    });
  }, [db.employees, q, roleF, deptF]);

  const openNew = () => { setDraft(emptyDraft(db.departments[0]?.name || "")); setOpen(true); };
  const openEdit = (e: Employee) => {
    setDraft({ ...e, password: e.password, confirm: e.password });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.name || !draft.email || !draft.password) return toast.error("Fill required fields");
    if (draft.password !== draft.confirm) return toast.error("Passwords do not match");
    if (draft.id) {
      await employeeService.update(draft.id, draft);
      toast.success("Employee updated");
    } else {
      const { confirm: _c, id: _i, ...rest } = draft;
      await employeeService.create(rest);
      toast.success("Employee added");
    }

    // Refresh the employee list
    await employeeService.list();

    setOpen(false);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Employees</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage staff accounts, roles, and status.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" /> Add employee</Button>
          </DialogTrigger>
          <DialogContent className="w-[96vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader><DialogTitle>{draft.id ? "Edit" : "New"} employee</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-2">
              <Field label="Full name"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" autoComplete="off" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
              <Field label="Password">
                <div className="relative">
                  <Input type={showPw ? "text" : "password"} autoComplete="new-password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute inset-y-0 right-2 grid place-items-center text-muted-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm password">
                <Input type={showPw ? "text" : "password"} autoComplete="new-password" value={draft.confirm} onChange={(e) => setDraft({ ...draft, confirm: e.target.value })} />
              </Field>
              <Field label="Phone"><Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
              <Field label="Department">
                <Select value={draft.department} onValueChange={(v) => setDraft({ ...draft, department: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {db.departments.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Role">
                <Select value={draft.role} onValueChange={(v) => setDraft({ ...draft, role: v as Role })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Joining date"><Input type="date" value={draft.joiningDate} onChange={(e) => setDraft({ ...draft, joiningDate: e.target.value })} /></Field>
              <Field label="Address" className="sm:col-span-2"><Textarea rows={2} value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></Field>
              <div className="sm:col-span-2 flex items-center gap-3">
                <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={save} className="w-full sm:w-auto">{draft.id ? "Save changes" : "Create employee"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="p-3.5 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 h-9 sm:h-10 text-sm" placeholder="Search by name, email, code..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2">
              <Select value={roleF} onValueChange={setRoleF}>
                <SelectTrigger className="w-full sm:w-[150px] h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={deptF} onValueChange={setDeptF}>
                <SelectTrigger className="w-full sm:w-[160px] h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {db.departments.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No employees found</TableCell></TableRow>
                )}
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{e.code}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{e.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{e.role}</TableCell>
                    <TableCell className="whitespace-nowrap">{e.department}</TableCell>
                    <TableCell className="text-muted-foreground">{e.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={e.active} onCheckedChange={() => employeeService.toggle(e.id)} />
                        <Badge variant={e.active ? "default" : "secondary"}>{e.active ? "Active" : "Inactive"}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={async () => { await employeeService.remove(e.id); toast.success("Employee removed"); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="space-y-3 md:hidden">
            {filtered.length === 0 ? (
              <div className="p-6 text-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No employees found
              </div>
            ) : (
              filtered.map((e) => (
                <div key={e.id} className="p-3.5 rounded-lg border bg-card/60 shadow-sm space-y-2.5">
                  {/* Top row: Code, Role badge, Status switch */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted font-medium text-foreground">
                        {e.code}
                      </span>
                      <Badge variant="outline" className="text-[11px] px-2 py-0 border-primary/30 text-primary bg-primary/5">
                        {e.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch 
                        checked={e.active} 
                        onCheckedChange={() => employeeService.toggle(e.id)} 
                        className="scale-90"
                      />
                      <Badge variant={e.active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-5">
                        {e.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  {/* Name and Department */}
                  <div>
                    <div className="font-semibold text-base text-foreground leading-snug">{e.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span className="font-medium text-foreground/80">{e.department}</span>
                      {e.joiningDate && (
                        <>
                          <span>•</span>
                          <span>Joined {e.joiningDate}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Contact info: Email, Phone */}
                  <div className="space-y-1 pt-1.5 border-t border-border/50 text-xs text-muted-foreground">
                    {e.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                        <span className="truncate">{e.email}</span>
                      </div>
                    )}
                    {e.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                        <span>{e.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 px-3 text-xs flex-1"
                      onClick={() => openEdit(e)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0" 
                      onClick={async () => { 
                        await employeeService.remove(e.id); 
                        toast.success("Employee removed"); 
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
