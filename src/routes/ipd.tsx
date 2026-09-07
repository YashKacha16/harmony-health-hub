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
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Trash2, Printer, FileText } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Patient } from "@/lib/store";
import { ConsentFormDialog } from "./reception";
import { NursingChartDialog } from "@/components/NursingChartDialog";

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    receptionService.listPatients();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [q]);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [printPatient, setPrintPatient] = useState<Patient | null>(null);
  const [chartPatient, setChartPatient] = useState<Patient | null>(null);

  const confirmDelete = async () => {
    if (deleteId) {
      await receptionService.deletePatient(deleteId);
      toast.success("Patient deleted");
      setDeleteId(null);
    }
  };

  const ipdPatients = db.patients.filter(
    (p) =>
      p.type === "IPD" &&
      (!q ||
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.code.toLowerCase().includes(q.toLowerCase()))
  );

  const totalPages = Math.ceil(ipdPatients.length / itemsPerPage);
  const paginatedPatients = ipdPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPatients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No IPD patients found.
                    </TableCell>
                  </TableRow>
                )}
                {paginatedPatients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      {p.age} / {p.gender}
                    </TableCell>
                    <TableCell>{p.ward || "-"}</TableCell>
                    <TableCell>{p.wardNumber || "-"}</TableCell>
                    <TableCell>{p.doctor || "-"}</TableCell>
                    <TableCell>{new Date(p.registeredAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setChartPatient(p)} title="Print Nursing / Vitals Chart" className="text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setPrintPatient(p)} title="Print Consent Form">
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="pt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="text-sm text-muted-foreground mx-4">Page {currentPage} of {totalPages}</span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the IPD patient and all associated records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {printPatient && (
        <ConsentFormDialog 
          patient={printPatient} 
          settings={db.hospitalSettings} 
          onClose={() => setPrintPatient(null)} 
          isReprint={true}
        />
      )}

      {chartPatient && (
        <NursingChartDialog
          patient={chartPatient}
          settings={db.hospitalSettings}
          onClose={() => setChartPatient(null)}
        />
      )}
    </div>
  );
}
