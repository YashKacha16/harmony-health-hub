import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Pencil, Plus, Search, Trash2, Eye, EyeOff } from "lucide-react";
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Employees</h2>
          <p className="text-sm text-muted-foreground">Manage staff accounts, roles, and status.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Add employee</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{draft.id ? "Edit" : "New"} employee</DialogTitle></DialogHeader>
            <div className="grid sm:grid-cols-2 gap-4">
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>{draft.id ? "Save changes" : "Create employee"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name, email, code..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={roleF} onValueChange={setRoleF}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={deptF} onValueChange={setDeptF}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {db.departments.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-x-auto">
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
                    <TableCell className="font-mono text-xs">{e.code}</TableCell>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{e.role}</TableCell>
                    <TableCell>{e.department}</TableCell>
                    <TableCell className="text-muted-foreground">{e.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={e.active} onCheckedChange={() => employeeService.toggle(e.id)} />
                        <Badge variant={e.active ? "default" : "secondary"}>{e.active ? "Active" : "Inactive"}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
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
