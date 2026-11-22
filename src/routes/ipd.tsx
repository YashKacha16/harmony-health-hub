import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RoleGuard";
import { useDB } from "@/lib/useStore";
import React, { useEffect, useState } from "react";
import { receptionService } from "@/services/receptionService";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Trash2, Printer, FileText, ChevronDown, ChevronRight, Edit, Receipt, AlertCircle, FileCheck, Scissors, ClipboardList, LogOut, Bed, UserCheck, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Patient } from "@/lib/store";
import { ConsentFormDialog, handlePrintMlc, handlePrintEmergency, handlePrintReceipt, handlePrintSurgery, handlePrintProcedureChart } from "./reception";
import { NursingChartDialog } from "@/components/NursingChartDialog";
import { DischargeCardDialog, handlePrintDischargeCard } from "@/components/DischargeCardDialog";
import { apiService } from "@/api/apiService";

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
  const [activeTab, setActiveTab] = useState<"admitted" | "discharged">("admitted");
  const [dischargePatient, setDischargePatient] = useState<Patient | null>(null);

  useEffect(() => {
    receptionService.listPatients();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [q, activeTab]);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [printPatient, setPrintPatient] = useState<Patient | null>(null);
  const [chartPatient, setChartPatient] = useState<{ patient: Patient, initialDate?: string } | null>(null);

  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [patientCharts, setPatientCharts] = useState<Record<string, any[]>>({});
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);

  const toggleRow = async (patientId: string) => {
    if (expandedRowId === patientId) {
      setExpandedRowId(null);
    } else {
      setExpandedRowId(patientId);
      if (!patientCharts[patientId]) {
        setIsLoadingCharts(true);
        try {
          const charts = await apiService.nursingCharts.getByPatientId(patientId);
          setPatientCharts(prev => ({ ...prev, [patientId]: charts }));
        } catch (err) {
          console.error(err);
          toast.error("Failed to load nursing charts");
        } finally {
          setIsLoadingCharts(false);
        }
      }
    }
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await receptionService.deletePatient(deleteId);
      toast.success("Patient deleted");
      setDeleteId(null);
    }
  };

  const isPatientDischarged = (p: Patient) => {
    return (
      p.status === "Completed" ||
      Boolean(
        localStorage.getItem(`lifecare_discharge_${p.code}`) ||
        localStorage.getItem(`lifecare_discharge_${p.id}`)
      )
    );
  };

  const allIpdPatients = db.patients.filter(
    (p) =>
      p.type === "IPD" &&
      (!q ||
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.code.toLowerCase().includes(q.toLowerCase()))
  );

  const admittedPatients = allIpdPatients.filter((p) => !isPatientDischarged(p));
  const dischargedPatients = allIpdPatients.filter((p) => isPatientDischarged(p));

  const currentPatients = activeTab === "admitted" ? admittedPatients : dischargedPatients;
  const totalPages = Math.ceil(currentPatients.length / itemsPerPage);
  const paginatedPatients = currentPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">IPD Patients</h2>
          <p className="text-sm text-muted-foreground">Manage active in-patients and patient discharge history.</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-2 w-full sm:w-[340px]">
            <TabsTrigger value="admitted" className="gap-2">
              <Bed className="h-4 w-4 text-emerald-600" />
              <span>Admitted</span>
              <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-4">
                {admittedPatients.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="discharged" className="gap-2">
              <UserCheck className="h-4 w-4 text-purple-600" />
              <span>Discharged</span>
              <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-4">
                {dischargedPatients.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
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

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
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
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No {activeTab === "admitted" ? "admitted" : "discharged"} IPD patients found.
                    </TableCell>
                  </TableRow>
                )}
                {paginatedPatients.map((p) => (
                  <React.Fragment key={p.id}>
                    <TableRow 
                      className={`cursor-pointer hover:bg-muted/50 ${expandedRowId === p.id ? "bg-muted/30" : ""}`}
                      onClick={() => toggleRow(p.id)}
                    >
                      <TableCell>
                        {expandedRowId === p.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.code}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{p.name}</span>
                          {p.isEmergency && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-bold tracking-wider">
                              EMERGENCY
                            </Badge>
                          )}
                          {p.isIcu && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-cyan-500 text-cyan-600 font-bold tracking-wider bg-cyan-500/10">
                              ICU
                            </Badge>
                          )}
                          {p.isSurgery && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-indigo-500 text-indigo-600 font-bold tracking-wider bg-indigo-500/10">
                              SURGERY
                            </Badge>
                          )}
                          {p.isMlc && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500 text-amber-600 font-bold tracking-wider bg-amber-500/10">
                              MLC
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.age} / {p.gender}
                      </TableCell>
                      <TableCell>{p.ward || "-"}</TableCell>
                      <TableCell>{p.wardNumber || "-"}</TableCell>
                      <TableCell>{p.doctor || "-"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{new Date(p.registeredAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {activeTab === "admitted" ? (
                          <StatusBadge status={p.status} />
                        ) : (
                          <Badge className="bg-purple-600 hover:bg-purple-600 text-white font-medium">
                            Discharged
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {activeTab === "admitted" ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setChartPatient({ patient: p, initialDate: "new" })}
                                className="h-8 gap-1.5 font-medium"
                                title="New Nursing Chart"
                              >
                                <FileText className="h-3.5 w-3.5 text-blue-600" />
                                <span>Chart</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDischargePatient(p)}
                                className="h-8 gap-1 font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-300"
                                title="Discharge Patient"
                              >
                                <LogOut className="h-3.5 w-3.5" />
                                <span>Discharge</span>
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrintDischargeCard(p, null, db.hospitalSettings)}
                                className="h-8 gap-1.5 font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-300"
                                title="Print Official Discharge Card"
                              >
                                <Printer className="h-3.5 w-3.5 text-purple-600" />
                                <span>Discharge Card</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setChartPatient({ patient: p, initialDate: "new" })}
                                className="h-8 gap-1.5 font-medium"
                                title="Nursing Chart History"
                              >
                                <FileText className="h-3.5 w-3.5 text-blue-600" />
                                <span>Chart</span>
                              </Button>
                            </>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" className="h-8 gap-1 px-2.5 font-medium" title="Print options">
                                <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Print</span>
                                <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              {activeTab === "discharged" && (
                                <DropdownMenuItem
                                  onClick={() => handlePrintDischargeCard(p, null, db.hospitalSettings)}
                                  className="cursor-pointer gap-2 py-2 text-purple-600 font-medium"
                                >
                                  <Printer className="h-4 w-4" />
                                  <div className="flex flex-col text-left">
                                    <span className="font-medium text-xs">Discharge Card</span>
                                    <span className="text-[10px] text-muted-foreground">Official 2-Page Card</span>
                                  </div>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => setPrintPatient(p)}
                                className="cursor-pointer gap-2 py-2"
                              >
                                <FileText className="h-4 w-4 text-blue-600" />
                                <div className="flex flex-col text-left">
                                  <span className="font-medium text-xs">Consent Form</span>
                                  <span className="text-[10px] text-muted-foreground">Admission &amp; Consent</span>
                                </div>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handlePrintReceipt(p, db.hospitalSettings)}
                                className="cursor-pointer gap-2 py-2"
                              >
                                <Receipt className="h-4 w-4 text-emerald-600" />
                                <div className="flex flex-col text-left">
                                  <span className="font-medium text-xs">Registration Receipt</span>
                                  <span className="text-[10px] text-muted-foreground">A4 IPD Registration Receipt</span>
                                </div>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handlePrintProcedureChart(p, db.hospitalSettings)}
                                className="cursor-pointer gap-2 py-2 text-teal-600 focus:text-teal-600 focus:bg-teal-50"
                              >
                                <ClipboardList className="h-4 w-4 text-teal-600" />
                                <div className="flex flex-col text-left">
                                  <span className="font-medium text-xs">Procedure Schedule Chart</span>
                                  <span className="text-[10px] text-teal-600/80">Daily Care &amp; Nursing Plan</span>
                                </div>
                              </DropdownMenuItem>

                              {p.isEmergency && (
                                <DropdownMenuItem
                                  onClick={() => handlePrintEmergency(p, db.hospitalSettings)}
                                  className="cursor-pointer gap-2 py-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                                >
                                  <AlertCircle className="h-4 w-4 text-rose-600" />
                                  <div className="flex flex-col text-left">
                                    <span className="font-medium text-xs">Emergency Form</span>
                                    <span className="text-[10px] text-rose-500/80">Clinical Emergency Sheet</span>
                                  </div>
                                </DropdownMenuItem>
                              )}

                              {p.isSurgery && (
                                <DropdownMenuItem
                                  onClick={() => handlePrintSurgery(p, db.hospitalSettings)}
                                  className="cursor-pointer gap-2 py-2 text-indigo-600 focus:text-indigo-600 focus:bg-indigo-50"
                                >
                                  <Scissors className="h-4 w-4 text-indigo-600" />
                                  <div className="flex flex-col text-left">
                                    <span className="font-medium text-xs">Surgery Consent Form</span>
                                    <span className="text-[10px] text-indigo-500/80">Operation &amp; Risk Record</span>
                                  </div>
                                </DropdownMenuItem>
                              )}

                              {p.isMlc && (
                                <DropdownMenuItem
                                  onClick={() => handlePrintMlc(p, db.hospitalSettings)}
                                  className="cursor-pointer gap-2 py-2 text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                                >
                                  <FileCheck className="h-4 w-4 text-amber-600" />
                                  <div className="flex flex-col text-left">
                                    <span className="font-medium text-xs">M.L.C. Form</span>
                                    <span className="text-[10px] text-amber-500/80">Medico-Legal Record</span>
                                  </div>
                                </DropdownMenuItem>
                              )}

                              {activeTab === "discharged" && (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    localStorage.removeItem(`lifecare_discharge_${p.code}`);
                                    localStorage.removeItem(`lifecare_discharge_${p.id}`);
                                    await receptionService.updateStatus(p.id, "Waiting");
                                    toast.success(`${p.name} re-admitted to IPD`);
                                    setActiveTab("admitted");
                                  }}
                                  className="cursor-pointer gap-2 py-2 text-blue-600 border-t"
                                >
                                  <RotateCcw className="h-4 w-4 text-blue-600" />
                                  <div className="flex flex-col text-left">
                                    <span className="font-medium text-xs">Re-admit Patient</span>
                                    <span className="text-[10px] text-muted-foreground">Return to active IPD</span>
                                  </div>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(p.id)}
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 ml-0.5"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {expandedRowId === p.id && (
                      <TableRow>
                        <TableCell colSpan={10} className="p-0 border-b">
                          <div className="bg-muted/10 p-4 border-l-4 border-l-primary/60 m-2 rounded-r-md">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-semibold text-sm">Nursing Charts History</h4>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setChartPatient({ patient: p, initialDate: "new" })}>
                                + New Chart
                              </Button>
                            </div>
                            
                            {isLoadingCharts && !patientCharts[p.id] ? (
                              <div className="text-xs text-muted-foreground py-2">Loading charts...</div>
                            ) : (
                              patientCharts[p.id]?.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {patientCharts[p.id].map(chart => (
                                    <div key={chart.date} className="bg-background border rounded-md p-3 flex justify-between items-center shadow-sm">
                                      <div>
                                        <div className="font-semibold text-sm">{chart.date}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                          {chart.medications?.length || 0} Meds • Every {chart.vitalsIntervalHours}h
                                        </div>
                                      </div>
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => setChartPatient({ patient: p, initialDate: chart.date })}>
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground py-2 border border-dashed rounded-md text-center bg-background/50">
                                  No nursing charts recorded for this patient yet.
                                </div>
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Grid View - Compact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:hidden">
            {paginatedPatients.length === 0 && (
              <div className="text-center text-muted-foreground py-8 text-sm col-span-full border rounded-lg bg-muted/20">
                No {activeTab === "admitted" ? "admitted" : "discharged"} IPD patients found.
              </div>
            )}
            {paginatedPatients.map((p) => {
              const isExpanded = expandedRowId === p.id;
              return (
                <div
                  key={p.id}
                  className={`rounded-lg border bg-card p-3 shadow-sm transition-colors flex flex-col justify-between gap-2 ${
                    isExpanded ? "border-primary/50 ring-1 ring-primary/20" : "hover:border-primary/40"
                  }`}
                >
                  {/* Clickable Header / Info Section to Toggle Nursing Chart */}
                  <div
                    className="cursor-pointer select-none space-y-1.5"
                    onClick={() => toggleRow(p.id)}
                    title="Click to view/hide Nursing Charts History"
                  >
                    {/* Top: Code with Chevron, Date, Status */}
                    <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-primary shrink-0 transition-transform" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground/70 shrink-0 transition-transform" />
                        )}
                        <span className="font-mono font-semibold text-primary/90">{p.code}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>{new Date(p.registeredAt).toLocaleDateString()}</span>
                        {activeTab === "admitted" ? (
                          <StatusBadge status={p.status} />
                        ) : (
                          <Badge className="bg-purple-600 hover:bg-purple-600 text-white font-medium text-[10px] px-1.5 py-0 h-4">
                            Discharged
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Name & Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{p.name}</span>
                      {p.isEmergency && (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5 font-bold tracking-wider">
                          EMERGENCY
                        </Badge>
                      )}
                      {p.isIcu && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-cyan-500 text-cyan-600 font-bold tracking-wider bg-cyan-500/10">
                          ICU
                        </Badge>
                      )}
                      {p.isSurgery && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-indigo-500 text-indigo-600 font-bold tracking-wider bg-indigo-500/10">
                          SURGERY
                        </Badge>
                      )}
                      {p.isMlc && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-amber-500 text-amber-600 font-bold tracking-wider bg-amber-500/10">
                          MLC
                        </Badge>
                      )}
                    </div>

                    {/* Details: Age/Gender & Ward & Doctor */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{p.age} / {p.gender}</span>
                      <span className="font-medium text-foreground/80">
                        Ward: {p.ward || "-"}{p.wardNumber ? ` (${p.wardNumber})` : ""}
                      </span>
                    </div>
                    {p.doctor && (
                      <div className="text-[11px] text-muted-foreground truncate">
                        Dr. {p.doctor}
                      </div>
                    )}
                  </div>

                  {/* Expanded Nursing Charts History Section */}
                  {isExpanded && (
                    <div 
                      className="bg-muted/30 p-2.5 rounded-md border-l-2 border-l-primary/70 my-1 space-y-2 animate-in fade-in-50 duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          Nursing Charts History
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2 font-medium"
                          onClick={() => setChartPatient({ patient: p, initialDate: "new" })}
                        >
                          + New Chart
                        </Button>
                      </div>

                      {isLoadingCharts && !patientCharts[p.id] ? (
                        <div className="text-[11px] text-muted-foreground py-1 text-center">Loading charts...</div>
                      ) : patientCharts[p.id]?.length > 0 ? (
                        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                          {patientCharts[p.id].map((chart) => (
                            <div
                              key={chart.date}
                              className="bg-card border rounded p-2 flex justify-between items-center text-xs shadow-xs"
                            >
                              <div>
                                <div className="font-semibold text-xs text-foreground">{chart.date}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {chart.medications?.length || 0} Meds • Every {chart.vitalsIntervalHours}h
                                </div>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-primary hover:bg-primary/10"
                                onClick={() => setChartPatient({ patient: p, initialDate: chart.date })}
                                title="Edit Chart"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-muted-foreground py-2 border border-dashed rounded text-center bg-background/50">
                          No nursing charts recorded for this patient yet.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bottom: Action buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/60 mt-1 gap-1">
                    <div className="flex items-center gap-1">
                      {activeTab === "admitted" ? (
                        <>
                          <Button
                            size="sm"
                            variant={isExpanded ? "default" : "outline"}
                            onClick={() => toggleRow(p.id)}
                            className="h-7 text-xs px-2 gap-1 font-medium"
                            title="Nursing Charts History"
                          >
                            <FileText className="h-3 w-3" />
                            <span>Chart</span>
                            {isExpanded ? (
                              <ChevronDown className="h-2.5 w-2.5 opacity-70" />
                            ) : (
                              <ChevronRight className="h-2.5 w-2.5 opacity-70" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDischargePatient(p)}
                            className="h-7 text-xs px-2 gap-1 font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-300"
                            title="Discharge Patient"
                          >
                            <LogOut className="h-3 w-3" />
                            <span>Discharge</span>
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintDischargeCard(p, null, db.hospitalSettings)}
                            className="h-7 text-xs px-2 gap-1 font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-300"
                            title="Print Official Discharge Card"
                          >
                            <Printer className="h-3 w-3 text-purple-600" />
                            <span>Card</span>
                          </Button>
                          <Button
                            size="sm"
                            variant={isExpanded ? "default" : "outline"}
                            onClick={() => toggleRow(p.id)}
                            className="h-7 text-xs px-2 gap-1 font-medium"
                            title="Nursing Chart History"
                          >
                            <FileText className="h-3 w-3" />
                            <span>Chart</span>
                            {isExpanded ? (
                              <ChevronDown className="h-2.5 w-2.5 opacity-70" />
                            ) : (
                              <ChevronRight className="h-2.5 w-2.5 opacity-70" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>

                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2 font-medium" title="Print options">
                          <Printer className="h-3 w-3 text-muted-foreground" />
                          <span>Print</span>
                          <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        {activeTab === "discharged" && (
                          <DropdownMenuItem
                            onClick={() => handlePrintDischargeCard(p, null, db.hospitalSettings)}
                            className="cursor-pointer gap-2 py-2 text-purple-600 font-medium"
                          >
                            <Printer className="h-4 w-4" />
                            <div className="flex flex-col text-left">
                              <span className="font-medium text-xs">Discharge Card</span>
                              <span className="text-[10px] text-muted-foreground">Official 2-Page Card</span>
                            </div>
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem
                          onClick={() => setPrintPatient(p)}
                          className="cursor-pointer gap-2 py-2"
                        >
                          <FileText className="h-4 w-4 text-blue-600" />
                          <div className="flex flex-col text-left">
                            <span className="font-medium text-xs">Consent Form</span>
                            <span className="text-[10px] text-muted-foreground">Admission &amp; Consent</span>
                          </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => handlePrintReceipt(p, db.hospitalSettings)}
                          className="cursor-pointer gap-2 py-2"
                        >
                          <Receipt className="h-4 w-4 text-emerald-600" />
                          <div className="flex flex-col text-left">
                            <span className="font-medium text-xs">Registration Receipt</span>
                            <span className="text-[10px] text-muted-foreground">A4 IPD Registration Receipt</span>
                          </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => handlePrintProcedureChart(p, db.hospitalSettings)}
                          className="cursor-pointer gap-2 py-2 text-teal-600 focus:text-teal-600 focus:bg-teal-50"
                        >
                          <ClipboardList className="h-4 w-4 text-teal-600" />
                          <div className="flex flex-col text-left">
                            <span className="font-medium text-xs">Procedure Schedule Chart</span>
                            <span className="text-[10px] text-teal-600/80">Daily Care &amp; Nursing Plan</span>
                          </div>
                        </DropdownMenuItem>

                        {p.isEmergency && (
                          <DropdownMenuItem
                            onClick={() => handlePrintEmergency(p, db.hospitalSettings)}
                            className="cursor-pointer gap-2 py-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                          >
                            <AlertCircle className="h-4 w-4 text-rose-600" />
                            <div className="flex flex-col text-left">
                              <span className="font-medium text-xs">Emergency Form</span>
                              <span className="text-[10px] text-rose-500/80">Clinical Emergency Sheet</span>
                            </div>
                          </DropdownMenuItem>
                        )}

                        {p.isSurgery && (
                          <DropdownMenuItem
                            onClick={() => handlePrintSurgery(p, db.hospitalSettings)}
                            className="cursor-pointer gap-2 py-2 text-indigo-600 focus:text-indigo-600 focus:bg-indigo-50"
                          >
                            <Scissors className="h-4 w-4 text-indigo-600" />
                            <div className="flex flex-col text-left">
                              <span className="font-medium text-xs">Surgery Consent Form</span>
                              <span className="text-[10px] text-indigo-500/80">Operation &amp; Risk Record</span>
                            </div>
                          </DropdownMenuItem>
                        )}

                        {p.isMlc && (
                          <DropdownMenuItem
                            onClick={() => handlePrintMlc(p, db.hospitalSettings)}
                            className="cursor-pointer gap-2 py-2 text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                          >
                            <FileCheck className="h-4 w-4 text-amber-600" />
                            <div className="flex flex-col text-left">
                              <span className="font-medium text-xs">M.L.C. Form</span>
                              <span className="text-[10px] text-amber-500/80">Medico-Legal Record</span>
                            </div>
                          </DropdownMenuItem>
                        )}

                        {activeTab === "discharged" && (
                          <DropdownMenuItem
                            onClick={async () => {
                              localStorage.removeItem(`lifecare_discharge_${p.code}`);
                              localStorage.removeItem(`lifecare_discharge_${p.id}`);
                              await receptionService.updateStatus(p.id, "Waiting");
                              toast.success(`${p.name} re-admitted to IPD`);
                              setActiveTab("admitted");
                            }}
                            className="cursor-pointer gap-2 py-2 text-blue-600 border-t"
                          >
                            <RotateCcw className="h-4 w-4 text-blue-600" />
                            <div className="flex flex-col text-left">
                              <span className="font-medium text-xs">Re-admit Patient</span>
                              <span className="text-[10px] text-muted-foreground">Return to active IPD</span>
                            </div>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(p.id)}
                      className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
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
          patient={chartPatient.patient}
          settings={db.hospitalSettings}
          onClose={() => setChartPatient(null)}
          onSave={() => {
            // Re-fetch charts immediately when save happens to keep grid in sync
            if (expandedRowId === chartPatient.patient.id) {
              apiService.nursingCharts.getByPatientId(chartPatient.patient.id).then((charts) => {
                setPatientCharts(prev => ({ ...prev, [chartPatient.patient.id]: charts }));
              });
            }
          }}
          initialDate={chartPatient.initialDate}
        />
      )}

      {dischargePatient && (
        <DischargeCardDialog
          patient={dischargePatient}
          isOpen={!!dischargePatient}
          onClose={() => setDischargePatient(null)}
          onDischarged={() => {
            setActiveTab("discharged");
            receptionService.listPatients();
          }}
          settings={db.hospitalSettings}
        />
      )}
    </div>
  );
}
