import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Printer, Check, User, HeartPulse, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import type { Patient } from "@/lib/store";
import { receptionService } from "@/services/receptionService";

export interface DischargeCardData {
  patientId: string;
  patientCode: string;
  patientName: string;
  ageGender: string;
  phone: string;
  mediclaim: string;
  insuranceCompany: string;
  insuranceAmount: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  doctorIncharge: string;
  medicalOfficer: string;

  // Admission 1st Day Vitals
  admissionBp: string;
  admissionPulse: string;
  admissionSpo2: string;
  admissionTemp: string;
  admissionRespRate: string;

  // Discharge Vitals
  dischargeBp: string;
  dischargePulse: string;
  dischargeSpo2: string;
  dischargeTemp: string;
  dischargeRespRate: string;

  // Clinical
  admissionHealthCondition: string;
  dateOfAdmission: string;
  timeOfAdmission: string;
  pastHospitalHistory: string;
  dischargeTimeCondition: string;
  dateOfDischarge: string;
  timeOfDischarge: string;

  // Page 2
  givenTotalTreatment: string;
  investigations: string;
  conditionAtAdmission: string; // WEEKNESS, MEDIUM, POOR, COMPLITLY ON BED, ACCIDENTAL, SERIOUS
  conditionAtDischarge: string; // BETTER, GOOD, MEDIUM, POOR, WEEK, COMPLITLY ON BED, DEATH
  causeOfDeath: string;
  followUpDays: string;
  followUpDate: string;

  // Signatures
  patientNameSign: string;
  relative1Name: string;
  relative2Name: string;

  dischargedAt: string;
}

export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getLocalTimeString = (d: Date = new Date()): string => {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const ensureTimeFormat = (timeStr?: string, fallbackDate: Date = new Date()): string => {
  if (timeStr && timeStr.trim()) {
    const clean = timeStr.trim();
    // 24-hour HH:mm
    if (/^\d{2}:\d{2}$/.test(clean)) return clean;
    if (/^\d{1}:\d{2}$/.test(clean)) return `0${clean}`;
    // 12-hour format like 10:30 PM, 9:15 am, 11:45:00 PM
    const match12 = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const mins = match12[2];
      const modifier = match12[3] ? match12[3].toUpperCase() : null;
      if (modifier === "PM" && hours < 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;
      return `${String(hours).padStart(2, "0")}:${mins}`;
    }
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return getLocalTimeString(parsed);
    }
  }
  return getLocalTimeString(fallbackDate);
};

export const ensureDateFormat = (dateStr?: string, fallbackDate: Date = new Date()): string => {
  if (dateStr && dateStr.trim()) {
    const clean = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, "0");
      const month = dmyMatch[2].padStart(2, "0");
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return getLocalDateString(parsed);
    }
  }
  return getLocalDateString(fallbackDate);
};

export const formatDisplayDate = (dateStr?: string): string => {
  if (!dateStr || !dateStr.trim()) return "-";
  const s = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}-${m}-${y}`;
  }
  return s;
};

export const formatDisplayTime = (timeStr?: string): string => {
  if (!timeStr || !timeStr.trim()) return "-";
  const s = timeStr.trim();
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(":");
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, "0")}:${m} ${ampm}`;
  }
  return s;
};

export const getDischargeData = (patient: Patient): DischargeCardData | null => {
  try {
    const raw =
      localStorage.getItem(`lifecare_discharge_${patient.code}`) ||
      localStorage.getItem(`lifecare_discharge_${patient.id}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading discharge data", err);
  }
  return null;
};

export const handlePrintDischargeCard = (
  patient: Patient,
  data?: DischargeCardData | null,
  settings?: any
) => {
  const now = new Date();
  const regDate = patient.registeredAt && !isNaN(new Date(patient.registeredAt).getTime())
    ? new Date(patient.registeredAt)
    : now;

  const d: DischargeCardData = data || getDischargeData(patient) || {
    patientId: patient.id,
    patientCode: patient.code,
    patientName: patient.name,
    ageGender: `${patient.age} / ${patient.gender}`,
    phone: patient.phone,
    mediclaim: patient.mediclaim ? "YES" : "NO",
    insuranceCompany: patient.insuranceCompany || "",
    insuranceAmount: patient.policyNumber || "",
    city: patient.city || "",
    state: patient.state || "",
    pincode: patient.pincode || "",
    address: patient.addressLine || "",
    doctorIncharge: patient.doctor || "",
    medicalOfficer: "",
    admissionBp: "",
    admissionPulse: "",
    admissionSpo2: "",
    admissionTemp: "",
    admissionRespRate: "",
    dischargeBp: "",
    dischargePulse: "",
    dischargeSpo2: "",
    dischargeTemp: "",
    dischargeRespRate: "",
    admissionHealthCondition: patient.complaint || "",
    dateOfAdmission: getLocalDateString(regDate),
    timeOfAdmission: getLocalTimeString(regDate),
    pastHospitalHistory: patient.emergencyPastHistory || patient.mlcAnyOfHospitalisedPastHO || "",
    dischargeTimeCondition: "",
    dateOfDischarge: getLocalDateString(now),
    timeOfDischarge: getLocalTimeString(now),
    givenTotalTreatment: "",
    investigations: "",
    conditionAtAdmission: "",
    conditionAtDischarge: "",
    causeOfDeath: "",
    followUpDays: "",
    followUpDate: "",
    patientNameSign: patient.name,
    relative1Name: patient.relativeName || "",
    relative2Name: "",
    dischargedAt: new Date().toISOString(),
  };

  let printIframe = document.getElementById("discharge-print-iframe") as HTMLIFrameElement;
  if (!printIframe) {
    printIframe = document.createElement("iframe");
    printIframe.id = "discharge-print-iframe";
    printIframe.style.position = "fixed";
    printIframe.style.top = "-9999px";
    printIframe.style.left = "-9999px";
    printIframe.style.width = "0";
    printIframe.style.height = "0";
    printIframe.style.border = "none";
    document.body.appendChild(printIframe);
  }

  const printWindow = printIframe.contentWindow;
  if (!printWindow) return;

  const logoUrl =
    settings?.logoUrl && settings.logoUrl !== "/logo.png" && settings.logoUrl !== "/logo.jpg"
      ? settings.logoUrl
      : "/lifecare-logo.jpg";
  const helpline = settings?.helpline || "7016124362";

  const renderHeader = (pageNumber: string) => `
    <div class="top-section">
      <div class="logo-container">
        <img src="${logoUrl}" alt="Hospital Logo" onerror="this.src='/lifecare-logo.jpg'" />
      </div>
      <div class="helpline-circle">
        <span class="helpline-title">Help Line :</span>
        <span class="helpline-number">${helpline}</span>
      </div>
    </div>
    <div class="doc-title-bar">
      <div class="doc-title">DISCHARGE CARD</div>
    </div>
  `;

  const admissionConditions = ["WEEKNESS", "MEDIUM", "POOR", "COMPLITLY ON BED", "ACCIDENTAL", "SERIOUS"];
  const dischargeConditions = ["BETTER", "GOOD", "MEDIUM", "POOR", "WEEK", "COMPLITLY ON BED", "DEATH"];

  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Discharge Card - ${patient.code} - ${patient.name}</title>
        <style>
          @page { margin: 0; size: A4; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            font-size: 11px;
            line-height: 1.35;
          }
          .page-sheet {
            width: 210mm;
            min-height: 295mm;
            margin: 0 auto;
            padding: 14px 24px;
            position: relative;
            box-sizing: border-box;
            page-break-after: always;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .page-sheet:last-child {
            page-break-after: avoid;
          }
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-12deg);
            -webkit-transform: translate(-50%, -50%) rotate(-12deg);
            opacity: 0.12;
            z-index: 0;
            pointer-events: none;
            width: 80%;
            max-width: 600px;
            text-align: center;
          }
          .watermark img {
            width: 100%;
            object-fit: contain;
          }
          .content-wrapper {
            position: relative;
            z-index: 1;
            flex: 1;
          }
          .top-section {
            background-color: #4b4b4b !important;
            margin: 5px 10px 18px 10px;
            border-radius: 40px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 115px;
            position: relative;
            border: 1px solid black;
          }
          .logo-container {
            background-color: white !important;
            height: 100%;
            width: calc(100% - 170px);
            border-radius: 40px 0 0 40px;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            padding: 0;
            border: 1px solid black;
            overflow: hidden;
          }
          .logo-container img {
            width: 100%;
            height: 100%;
            border-radius: 40px 0 0 40px;
            object-fit: fill;
          }
          .helpline-circle {
            background-color: white !important;
            width: 140px;
            height: 140px;
            border-radius: 50%;
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            z-index: 10;
            border: 1px solid black;
          }
          .helpline-title {
            font-size: 13px;
            margin-bottom: 2px;
            color: #e53e3e;
          }
          .helpline-number {
            font-size: 16px;
            font-weight: bold;
            color: #e53e3e;
          }
          .doc-title-bar {
            text-align: center;
            margin-bottom: 12px;
          }
          .doc-title {
            font-size: 15px;
            font-weight: bold;
            color: #e53e3e;
            text-decoration: underline;
            letter-spacing: 1.5px;
            text-transform: uppercase;
          }
          .demo-row {
            display: flex;
            align-items: baseline;
            margin-bottom: 8px;
            font-size: 11px;
            font-weight: bold;
          }
          .dotted-line {
            flex: 1;
            border-bottom: 1px dotted #333;
            padding-left: 6px;
            font-weight: normal;
            color: #111;
          }
          .vitals-table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            border: 1px solid black;
          }
          .vitals-table th {
            border: 1px solid black;
            padding: 5px 8px;
            font-weight: bold;
            font-size: 11px;
            text-align: left;
            background: #f8fafc;
            width: 50%;
          }
          .vitals-table td {
            border: 1px solid black;
            padding: 5px 8px;
            font-size: 11px;
            vertical-align: middle;
          }
          .tbl-bordered {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid black;
            margin-bottom: 12px;
          }
          .tbl-bordered th, .tbl-bordered td {
            border: 1px solid black;
            padding: 6px 8px;
            font-size: 11px;
          }
          .tbl-bordered th {
            background: #f8fafc;
            font-weight: bold;
          }
          .page-num {
            text-align: right;
            font-weight: bold;
            font-size: 10px;
            margin-top: 10px;
          }
          .cond-box {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 1.5px solid black;
            margin-right: 5px;
            text-align: center;
            line-height: 10px;
            font-weight: bold;
            font-size: 10px;
            vertical-align: middle;
          }
          .cond-active {
            background-color: #000;
            color: #fff;
          }
          .sign-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-top: 14px;
            font-size: 11px;
            font-weight: bold;
          }
          .sign-line {
            width: 200px;
            border-bottom: 1px solid black;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="watermark">
          <img src="${logoUrl}" alt="Watermark" onerror="this.src='/lifecare-logo.jpg'" />
        </div>

        <!-- PAGE 1 -->
        <div class="page-sheet">
          <div class="content-wrapper">
            ${renderHeader("P – 01 OF 02.")}

            <!-- Demographics -->
            <div style="margin-bottom: 12px;">
              <div class="demo-row">
                <span style="white-space: nowrap;">PATIENT FULL NAME : -</span>
                <span class="dotted-line" style="font-weight: bold; text-transform: uppercase;">${d.patientName}</span>
              </div>
              <div class="demo-row">
                <span style="white-space: nowrap;">AGE / Gender -</span>
                <span class="dotted-line" style="flex: 0 0 160px;">${d.ageGender}</span>
                <span style="white-space: nowrap; margin-left: 15px;">MO., NO,. -</span>
                <span class="dotted-line" style="flex: 0 0 160px;">${d.phone}</span>
                <span style="white-space: nowrap; margin-left: 15px;">MEDICLAIM –</span>
                <span class="dotted-line" style="font-weight: bold;">${d.mediclaim}</span>
              </div>
              <div class="demo-row">
                <span style="white-space: nowrap;">COMPANY NAME -</span>
                <span class="dotted-line">${d.mediclaim === 'NO' ? '-' : (d.insuranceCompany || '-')}</span>
                <span style="white-space: nowrap; margin-left: 15px;">INSURANCE AMOUNT-</span>
                <span class="dotted-line">${d.mediclaim === 'NO' ? '-' : (d.insuranceAmount || '-')}</span>
              </div>
              <div class="demo-row">
                <span style="white-space: nowrap;">CITY -</span>
                <span class="dotted-line" style="flex: 1;">${d.city || "-"}</span>
                <span style="white-space: nowrap; margin-left: 15px;">STATE -</span>
                <span class="dotted-line" style="flex: 1;">${d.state || "-"}</span>
                <span style="white-space: nowrap; margin-left: 15px;">PIN NO,. -</span>
                <span class="dotted-line" style="flex: 1;">${d.pincode || "-"}</span>
              </div>
              <div class="demo-row">
                <span style="white-space: nowrap;">ADDRESS -</span>
                <span class="dotted-line">${d.address || "-"}</span>
              </div>
              <div class="demo-row" style="margin-top: 6px;">
                <span style="white-space: nowrap;">Dr. INCHARGE -</span>
                <span class="dotted-line" style="font-weight: bold;">${d.doctorIncharge || "-"}</span>
                <span style="white-space: nowrap; margin-left: 20px;">MEDICAL OFFICER -</span>
                <span class="dotted-line">${d.medicalOfficer || "-"}</span>
              </div>
            </div>

            <!-- Vitals Comparison Table -->
            <table class="vitals-table">
              <thead>
                <tr>
                  <th>AT ADDMITION 1st DAY VITALS</th>
                  <th>AT TIME DISCHARGE VITALS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>B.P. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = &nbsp;<strong>${d.admissionBp || "-"}</strong></td>
                  <td>B.P. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = &nbsp;<strong>${d.dischargeBp || "-"}</strong></td>
                </tr>
                <tr>
                  <td>PLUSE &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = &nbsp;<strong>${d.admissionPulse || "-"}</strong></td>
                  <td>PLUSE &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = &nbsp;<strong>${d.dischargePulse || "-"}</strong></td>
                </tr>
                <tr>
                  <td>SPo2 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = &nbsp;<strong>${d.admissionSpo2 || "-"}</strong></td>
                  <td>SPo2 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = &nbsp;<strong>${d.dischargeSpo2 || "-"}</strong></td>
                </tr>
                <tr>
                  <td>TEMPRETURE &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = &nbsp;<strong>${d.admissionTemp || "-"}</strong></td>
                  <td>TEMPRETURE &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = &nbsp;<strong>${d.dischargeTemp || "-"}</strong></td>
                </tr>
                <tr>
                  <td>RESPIRETORY RATE &nbsp;&nbsp;&nbsp;&nbsp; = &nbsp;<strong>${d.admissionRespRate || "-"}</strong></td>
                  <td>RESPIRETORY RATE &nbsp;&nbsp;&nbsp;&nbsp; = &nbsp;<strong>${d.dischargeRespRate || "-"}</strong></td>
                </tr>
              </tbody>
            </table>

            <!-- Clinical Condition Notes -->
            <div style="margin-top: 12px; font-size: 11px;">
              <div class="demo-row">
                <span style="white-space: nowrap;">ADDMITION TIME HEALTH CONDITION -</span>
                <span class="dotted-line">${d.admissionHealthCondition || "-"}</span>
              </div>
              <div class="demo-row">
                <span style="white-space: nowrap;">DATE OF ADDMITION -</span>
                <span class="dotted-line" style="flex: 1;">${formatDisplayDate(d.dateOfAdmission)}</span>
                <span style="white-space: nowrap; margin-left: 20px;">TIME OF ADDMITION -</span>
                <span class="dotted-line" style="flex: 1;">${formatDisplayTime(d.timeOfAdmission)}</span>
              </div>
              <div class="demo-row">
                <span style="white-space: nowrap;">ANY OF HOSPITALISED PAST H/O -</span>
                <span class="dotted-line">${d.pastHospitalHistory || "-"}</span>
              </div>
              <div class="demo-row">
                <span style="white-space: nowrap;">DISCHARGE TIME CONDITION -</span>
                <span class="dotted-line">${d.dischargeTimeCondition || "-"}</span>
              </div>
              <div class="demo-row">
                <span style="white-space: nowrap;">DATE OF DISCHARGE : -</span>
                <span class="dotted-line" style="flex: 1;">${formatDisplayDate(d.dateOfDischarge)}</span>
                <span style="white-space: nowrap; margin-left: 20px;">TIME OF DISCHARGE : -</span>
                <span class="dotted-line" style="flex: 1;">${formatDisplayTime(d.timeOfDischarge)}</span>
              </div>
            </div>
          </div>

          <div class="page-num">P – 01 OF 02.</div>
        </div>

        <!-- PAGE 2 -->
        <div class="page-sheet">
          <div class="content-wrapper">
            ${renderHeader("P – 02 Of 02.")}

            <!-- Given Treatment & Investigations -->
            <table class="tbl-bordered" style="min-height: 220px;">
              <thead>
                <tr>
                  <th style="width: 50%;">GIVEN TOTAL TREATMENT</th>
                  <th style="width: 50%;">INVESTIGATIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="vertical-align: top; height: 210px; font-size: 11px; white-space: pre-wrap;">${d.givenTotalTreatment || "-"}</td>
                  <td style="vertical-align: top; height: 210px; font-size: 11px; white-space: pre-wrap;">${d.investigations || "-"}</td>
                </tr>
              </tbody>
            </table>

            <!-- Condition at Admission -->
            <table class="tbl-bordered" style="margin-bottom: 10px;">
              <thead>
                <tr>
                  <th colspan="3" style="text-align: center;">CONDITION OF PATIENT WHEN ADDMITION</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="width: 33.3%;">
                    <span class="cond-box ${d.conditionAtAdmission === 'WEEKNESS' ? 'cond-active' : ''}">${d.conditionAtAdmission === 'WEEKNESS' ? '✓' : ''}</span> WEEKNESS
                  </td>
                  <td style="width: 33.3%;">
                    <span class="cond-box ${d.conditionAtAdmission === 'MEDIUM' ? 'cond-active' : ''}">${d.conditionAtAdmission === 'MEDIUM' ? '✓' : ''}</span> MEDIUM
                  </td>
                  <td style="width: 33.3%;">
                    <span class="cond-box ${d.conditionAtAdmission === 'POOR' ? 'cond-active' : ''}">${d.conditionAtAdmission === 'POOR' ? '✓' : ''}</span> POOR
                  </td>
                </tr>
                <tr>
                  <td>
                    <span class="cond-box ${d.conditionAtAdmission === 'COMPLITLY ON BED' ? 'cond-active' : ''}">${d.conditionAtAdmission === 'COMPLITLY ON BED' ? '✓' : ''}</span> COMPLITLY ON BED
                  </td>
                  <td>
                    <span class="cond-box ${d.conditionAtAdmission === 'ACCIDENTAL' ? 'cond-active' : ''}">${d.conditionAtAdmission === 'ACCIDENTAL' ? '✓' : ''}</span> ACCIDENTAL
                  </td>
                  <td>
                    <span class="cond-box ${d.conditionAtAdmission === 'SERIOUS' ? 'cond-active' : ''}">${d.conditionAtAdmission === 'SERIOUS' ? '✓' : ''}</span> SERIOUS
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Condition at Discharge -->
            <table class="tbl-bordered" style="margin-bottom: 12px;">
              <thead>
                <tr>
                  <th colspan="3" style="text-align: center;">CONDITION OF PATIENT AT DISCHARGE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="width: 33.3%;">
                    <span class="cond-box ${d.conditionAtDischarge === 'BETTER' ? 'cond-active' : ''}">${d.conditionAtDischarge === 'BETTER' ? '✓' : ''}</span> BETTER
                  </td>
                  <td style="width: 33.3%;">
                    <span class="cond-box ${d.conditionAtDischarge === 'GOOD' ? 'cond-active' : ''}">${d.conditionAtDischarge === 'GOOD' ? '✓' : ''}</span> GOOD
                  </td>
                  <td style="width: 33.3%;">
                    <span class="cond-box ${d.conditionAtDischarge === 'MEDIUM' ? 'cond-active' : ''}">${d.conditionAtDischarge === 'MEDIUM' ? '✓' : ''}</span> MEDIUM
                  </td>
                </tr>
                <tr>
                  <td>
                    <span class="cond-box ${d.conditionAtDischarge === 'POOR' ? 'cond-active' : ''}">${d.conditionAtDischarge === 'POOR' ? '✓' : ''}</span> POOR
                  </td>
                  <td>
                    <span class="cond-box ${d.conditionAtDischarge === 'WEEK' ? 'cond-active' : ''}">${d.conditionAtDischarge === 'WEEK' ? '✓' : ''}</span> WEEK
                  </td>
                  <td>
                    <span class="cond-box ${d.conditionAtDischarge === 'COMPLITLY ON BED' ? 'cond-active' : ''}">${d.conditionAtDischarge === 'COMPLITLY ON BED' ? '✓' : ''}</span> COMPLITLY ON BED
                  </td>
                </tr>
                <tr>
                  <td colspan="3">
                    <span class="cond-box ${d.conditionAtDischarge === 'DEATH' ? 'cond-active' : ''}">${d.conditionAtDischarge === 'DEATH' ? '✓' : ''}</span> DEATH
                    ${d.conditionAtDischarge === 'DEATH' || d.causeOfDeath ? `&nbsp;&nbsp;&nbsp;&nbsp;<strong>CAUSE OF DEATH:</strong> ${d.causeOfDeath || '-'}` : ''}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Follow-up -->
            <div style="margin-top: 10px; font-size: 11px; font-weight: bold;">
              <div class="demo-row">
                <span>FOLLOW-UP AFTER</span>
                <span class="dotted-line" style="flex: 0 0 50px; text-align: center;">${d.followUpDays || "3"}</span>
                <span>DAYS AT THE DATE OF</span>
                <span class="dotted-line" style="flex: 1;">${d.followUpDate || "-"}</span>
              </div>
              <div style="margin-top: 8px; font-weight: bold; text-decoration: underline;">
                WITH TOTAL HOSPITAL DOCUMNT COLLECTED GIVEN FILE.
              </div>
            </div>

            <!-- Signatures -->
            <div style="margin-top: 35px;">
              <div class="sign-row">
                <span>NAME OF PATIENT : - <span style="font-weight: normal;">${d.patientNameSign || d.patientName}</span></span>
                <span>SIGNETURE : - <span class="sign-line"></span></span>
              </div>
              <div class="sign-row">
                <span>(1) NAME OF RELATIVE : - <span style="font-weight: normal;">${d.relative1Name || "-"}</span></span>
                <span>SIGNETURE : - <span class="sign-line"></span></span>
              </div>
              <div class="sign-row">
                <span>(2) NAME OF RELATIVE : - <span style="font-weight: normal;">${d.relative2Name || "-"}</span></span>
                <span>SIGNETURE : - <span class="sign-line"></span></span>
              </div>
            </div>
          </div>

          <div class="page-num">P – 02 Of 02.</div>
        </div>

        <script>
          window.addEventListener('load', function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 300);
          });
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(content);
  printWindow.document.close();
};

export function DischargeCardDialog({
  patient,
  isOpen,
  onClose,
  onDischarged,
  settings,
}: {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onDischarged: (patient: Patient) => void;
  settings?: any;
}) {
  const [formData, setFormData] = useState<DischargeCardData>({
    patientId: "",
    patientCode: "",
    patientName: "",
    ageGender: "",
    phone: "",
    mediclaim: "NO",
    insuranceCompany: "",
    insuranceAmount: "",
    city: "",
    state: "",
    pincode: "",
    address: "",
    doctorIncharge: "",
    medicalOfficer: "",
    admissionBp: "",
    admissionPulse: "",
    admissionSpo2: "",
    admissionTemp: "",
    admissionRespRate: "",
    dischargeBp: "",
    dischargePulse: "",
    dischargeSpo2: "",
    dischargeTemp: "",
    dischargeRespRate: "",
    admissionHealthCondition: "",
    dateOfAdmission: "",
    timeOfAdmission: "",
    pastHospitalHistory: "",
    dischargeTimeCondition: "",
    dateOfDischarge: "",
    timeOfDischarge: "",
    givenTotalTreatment: "",
    investigations: "",
    conditionAtAdmission: "",
    conditionAtDischarge: "",
    causeOfDeath: "",
    followUpDays: "",
    followUpDate: "",
    patientNameSign: "",
    relative1Name: "",
    relative2Name: "",
    dischargedAt: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!patient || !isOpen) return;

    // Check if existing discharge data exists
    const existing = getDischargeData(patient);

    const now = new Date();
    let regDate = now;
    if (patient.registeredAt) {
      const parsed = new Date(patient.registeredAt);
      if (!isNaN(parsed.getTime())) {
        regDate = parsed;
      }
    }

    const defaultAdmissionDate = getLocalDateString(regDate);
    const defaultAdmissionTime = getLocalTimeString(regDate);
    const defaultDischargeDate = getLocalDateString(now);
    const defaultDischargeTime = getLocalTimeString(now);

    if (existing) {
      setFormData({
        ...existing,
        dateOfAdmission: ensureDateFormat(existing.dateOfAdmission, regDate),
        timeOfAdmission: ensureTimeFormat(existing.timeOfAdmission, regDate),
        dateOfDischarge: ensureDateFormat(existing.dateOfDischarge, now),
        timeOfDischarge: ensureTimeFormat(existing.timeOfDischarge, now),
      });
    } else {
      setFormData({
        patientId: patient.id,
        patientCode: patient.code,
        patientName: patient.name || "",
        ageGender: `${patient.age || ""} / ${patient.gender || ""}`,
        phone: patient.phone || "",
        mediclaim: patient.mediclaim ? "YES" : "NO",
        insuranceCompany: patient.insuranceCompany || "",
        insuranceAmount: patient.policyNumber || "",
        city: patient.city || "",
        state: patient.state || "",
        pincode: patient.pincode || "",
        address: patient.addressLine || "",
        doctorIncharge: patient.doctor || "",
        medicalOfficer: patient.mlcMedicalOfficer || patient.emergencyMedicalOfficer || "",
        admissionBp: "",
        admissionPulse: "",
        admissionSpo2: "",
        admissionTemp: "",
        admissionRespRate: "",
        dischargeBp: "",
        dischargePulse: "",
        dischargeSpo2: "",
        dischargeTemp: "",
        dischargeRespRate: "",
        admissionHealthCondition: patient.complaint || "",
        dateOfAdmission: defaultAdmissionDate,
        timeOfAdmission: defaultAdmissionTime,
        pastHospitalHistory: patient.emergencyPastHistory || patient.mlcAnyOfHospitalisedPastHO || "",
        dischargeTimeCondition: "",
        dateOfDischarge: defaultDischargeDate,
        timeOfDischarge: defaultDischargeTime,
        givenTotalTreatment: "",
        investigations: "",
        conditionAtAdmission: "",
        conditionAtDischarge: "",
        causeOfDeath: "",
        followUpDays: "",
        followUpDate: "",
        patientNameSign: patient.name || "",
        relative1Name: patient.relativeName || "",
        relative2Name: "",
        dischargedAt: new Date().toISOString(),
      });
    }
  }, [patient, isOpen]);

  const setField = (field: keyof DischargeCardData, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  // Field tracking for empty counts
  const t1Fields = [
    { label: "Patient Full Name", val: formData.patientName },
    { label: "Age / Gender", val: formData.ageGender },
    { label: "Mobile Number", val: formData.phone },
    { label: "Mediclaim", val: formData.mediclaim },
    ...(formData.mediclaim === "YES"
      ? [
          { label: "Insurance Company", val: formData.insuranceCompany },
          { label: "Insurance / Policy No", val: formData.insuranceAmount },
        ]
      : []),
    { label: "City", val: formData.city },
    { label: "State", val: formData.state },
    { label: "Pincode", val: formData.pincode },
    { label: "Address", val: formData.address },
    { label: "Dr. In-Charge", val: formData.doctorIncharge },
    { label: "Medical Officer", val: formData.medicalOfficer },
  ];
  const t1Empty = t1Fields.filter((f) => !f.val || !f.val.trim()).length;

  const t2Fields = [
    { label: "Admission B.P.", val: formData.admissionBp },
    { label: "Admission Pulse", val: formData.admissionPulse },
    { label: "Admission SpO2", val: formData.admissionSpo2 },
    { label: "Admission Temperature", val: formData.admissionTemp },
    { label: "Admission Resp Rate", val: formData.admissionRespRate },
    { label: "Discharge B.P.", val: formData.dischargeBp },
    { label: "Discharge Pulse", val: formData.dischargePulse },
    { label: "Discharge SpO2", val: formData.dischargeSpo2 },
    { label: "Discharge Temperature", val: formData.dischargeTemp },
    { label: "Discharge Resp Rate", val: formData.dischargeRespRate },
  ];
  const t2Empty = t2Fields.filter((f) => !f.val || !f.val.trim()).length;

  const t3Fields = [
    { label: "Admission Health Condition", val: formData.admissionHealthCondition },
    { label: "Date of Admission", val: formData.dateOfAdmission },
    { label: "Past Hospital History", val: formData.pastHospitalHistory },
    { label: "Discharge Time Condition", val: formData.dischargeTimeCondition },
    { label: "Date of Discharge", val: formData.dateOfDischarge },
  ];
  const t3Empty = t3Fields.filter((f) => !f.val || !f.val.trim()).length;

  const t4Fields = [
    { label: "Given Total Treatment", val: formData.givenTotalTreatment },
    { label: "Investigations", val: formData.investigations },
    { label: "Condition at Admission", val: formData.conditionAtAdmission },
    { label: "Condition at Discharge", val: formData.conditionAtDischarge },
    { label: "Follow-Up Days", val: formData.followUpDays },
    { label: "Follow-Up Date", val: formData.followUpDate },
    { label: "Relative (1) Name", val: formData.relative1Name },
  ];
  const t4Empty = t4Fields.filter((f) => !f.val || !f.val.trim()).length;

  const totalEmpty = t1Empty + t2Empty + t3Empty + t4Empty;

  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false);
  const [pendingPrint, setPendingPrint] = useState(false);

  const requestDischarge = (andPrint: boolean) => {
    if (totalEmpty > 0) {
      setPendingPrint(andPrint);
      setShowConfirmEmpty(true);
    } else {
      executeDischarge(andPrint);
    }
  };

  const executeDischarge = async (andPrint: boolean = false) => {
    if (!patient) return;
    setIsSubmitting(true);

    try {
      const now = new Date();
      const regDate = patient.registeredAt && !isNaN(new Date(patient.registeredAt).getTime())
        ? new Date(patient.registeredAt)
        : now;

      const record: DischargeCardData = {
        ...formData,
        patientId: patient.id,
        patientCode: patient.code,
        // When admitted use that time, and when discharged use the discharge time
        timeOfAdmission: formData.timeOfAdmission || getLocalTimeString(regDate),
        timeOfDischarge: getLocalTimeString(now),
        dischargedAt: now.toISOString(),
      };

      // 1. Save to local storage
      localStorage.setItem(`lifecare_discharge_${patient.code}`, JSON.stringify(record));
      localStorage.setItem(`lifecare_discharge_${patient.id}`, JSON.stringify(record));

      // 2. Update patient status to "Completed"
      await receptionService.updateStatus(patient.id, "Completed");

      toast.success(`Patient ${patient.name} (${patient.code}) successfully discharged!`);

      if (andPrint) {
        handlePrintDischargeCard(patient, record, settings);
      }

      onDischarged(patient);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to process discharge");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!patient) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-6xl xl:max-w-7xl w-[96vw] sm:w-[98vw] h-[95vh] sm:h-[94vh] max-h-[95vh] flex flex-col p-3 sm:p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-1.5 pr-6 sm:pr-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
            <DialogTitle className="text-base sm:text-xl flex items-center gap-2">
              <HeartPulse className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0" />
              <span className="truncate">Patient Discharge &amp; Discharge Card — {patient.code}</span>
            </DialogTitle>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] sm:text-xs bg-amber-50 text-amber-700 border-amber-300 py-0 h-5">
                Ward: {patient.ward || "General"} {patient.wardNumber ? `(${patient.wardNumber})` : ""}
              </Badge>
              {totalEmpty > 0 ? (
                <Badge variant="destructive" className="text-[10px] sm:text-xs font-bold px-2 py-0 h-5 bg-amber-600 hover:bg-amber-600">
                  {totalEmpty} Empty Fields
                </Badge>
              ) : (
                <Badge className="text-[10px] sm:text-xs font-bold px-2 py-0 h-5 bg-emerald-600 hover:bg-emerald-600">
                  All Fields Filled ✓
                </Badge>
              )}
            </div>
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-none">
            Fill the discharge card details (all fields are optional). Patient will move to the Discharged tab.
          </p>
        </DialogHeader>

        {/* Highlighted Banner showing empty fields count */}
        <div className="shrink-0 my-1 sm:my-2">
          {totalEmpty > 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/40 text-amber-900 dark:text-amber-200 p-2 sm:px-4 sm:py-2.5 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-xs">
              <div className="flex items-start sm:items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                <span className="text-[11px] sm:text-xs leading-tight sm:leading-normal">
                  <strong className="text-amber-700 dark:text-amber-300 font-bold">{totalEmpty} field{totalEmpty > 1 ? "s" : ""} empty</strong>{" "}
                  (Vitals: <strong>{t2Empty}</strong>, Clinical: <strong>{t3Empty}</strong>, Treatment: <strong>{t4Empty}</strong>, Demographics: <strong>{t1Empty}</strong>).
                  Confirmation will be requested before final discharge.
                </span>
              </div>
              <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] sm:text-xs px-2 py-0.5 self-start sm:self-auto shrink-0">
                {totalEmpty} Unfilled
              </Badge>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 p-2 sm:px-4 sm:py-2 rounded-lg text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] sm:text-xs"><strong>All fields filled!</strong> Ready for immediate discharge.</span>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] sm:text-xs">Complete 100%</Badge>
            </div>
          )}
        </div>

        <Tabs defaultValue="demographics" className="w-full flex-1 flex flex-col overflow-hidden mt-1">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto sm:h-11 shrink-0 bg-muted/60 p-1 gap-1">
            <TabsTrigger value="demographics" className="text-[11px] sm:text-xs py-1.5 sm:py-2 px-2 gap-1 data-[state=active]:font-bold data-[state=active]:shadow-xs justify-between sm:justify-center">
              <span className="truncate">1. Demographics</span>
              {t1Empty > 0 ? (
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30 shrink-0">
                  {t1Empty}
                </span>
              ) : (
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 font-bold shrink-0">
                  ✓
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="vitals" className="text-[11px] sm:text-xs py-1.5 sm:py-2 px-2 gap-1 data-[state=active]:font-bold data-[state=active]:shadow-xs justify-between sm:justify-center">
              <span className="truncate">2. Vitals</span>
              {t2Empty > 0 ? (
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30 shrink-0">
                  {t2Empty}
                </span>
              ) : (
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 font-bold shrink-0">
                  ✓
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="clinical" className="text-[11px] sm:text-xs py-1.5 sm:py-2 px-2 gap-1 data-[state=active]:font-bold data-[state=active]:shadow-xs justify-between sm:justify-center">
              <span className="truncate">3. Clinical</span>
              {t3Empty > 0 ? (
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30 shrink-0">
                  {t3Empty}
                </span>
              ) : (
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 font-bold shrink-0">
                  ✓
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="treatment" className="text-[11px] sm:text-xs py-1.5 sm:py-2 px-2 gap-1 data-[state=active]:font-bold data-[state=active]:shadow-xs justify-between sm:justify-center">
              <span className="truncate">4. Treatment</span>
              {t4Empty > 0 ? (
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30 shrink-0">
                  {t4Empty}
                </span>
              ) : (
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 font-bold shrink-0">
                  ✓
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Demographics */}
          <TabsContent value="demographics" className="space-y-4 pt-3 flex-1 overflow-y-auto pr-2 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs">Patient Full Name</Label>
                <Input
                  value={formData.patientName}
                  onChange={(e) => setField("patientName", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Age / Gender</Label>
                <Input
                  value={formData.ageGender}
                  onChange={(e) => setField("ageGender", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Mobile Number</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Mediclaim (YES / NO)</Label>
                <select
                  value={formData.mediclaim}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      mediclaim: val,
                      insuranceCompany: val === "NO" ? "" : prev.insuranceCompany,
                      insuranceAmount: val === "NO" ? "" : prev.insuranceAmount,
                    }));
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                >
                  <option value="NO">NO</option>
                  <option value="YES">YES</option>
                </select>
              </div>
              <div>
                <Label className={`text-xs ${formData.mediclaim === "NO" ? "text-muted-foreground/60" : ""}`}>
                  Insurance Company
                </Label>
                <Input
                  value={formData.insuranceCompany}
                  onChange={(e) => setField("insuranceCompany", e.target.value)}
                  placeholder={formData.mediclaim === "NO" ? "Disabled (Mediclaim NO)" : "e.g. Star Health, HDFC Ergo"}
                  disabled={formData.mediclaim === "NO"}
                  className={`mt-1 ${formData.mediclaim === "NO" ? "bg-muted/40 cursor-not-allowed opacity-60" : ""}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <Label className={`text-xs ${formData.mediclaim === "NO" ? "text-muted-foreground/60" : ""}`}>
                  Insurance / Policy Amount / No
                </Label>
                <Input
                  value={formData.insuranceAmount}
                  onChange={(e) => setField("insuranceAmount", e.target.value)}
                  placeholder={formData.mediclaim === "NO" ? "Disabled (Mediclaim NO)" : "Policy number or amount"}
                  disabled={formData.mediclaim === "NO"}
                  className={`mt-1 ${formData.mediclaim === "NO" ? "bg-muted/40 cursor-not-allowed opacity-60" : ""}`}
                />
              </div>
              <div>
                <Label className="text-xs">City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setField("city", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">State</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setField("state", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Pincode</Label>
                <Input
                  value={formData.pincode}
                  onChange={(e) => setField("pincode", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setField("address", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <Label className="text-xs">Dr. In-Charge</Label>
                <Input
                  value={formData.doctorIncharge}
                  onChange={(e) => setField("doctorIncharge", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Medical Officer</Label>
                <Input
                  value={formData.medicalOfficer}
                  onChange={(e) => setField("medicalOfficer", e.target.value)}
                  placeholder="Attending MO name"
                  className="mt-1"
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: Vitals Comparison */}
          <TabsContent value="vitals" className="space-y-4 pt-3 flex-1 overflow-y-auto pr-2 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Admission Vitals */}
              <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
                <h4 className="font-semibold text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <HeartPulse className="h-3.5 w-3.5" />
                  At Admission 1st Day Vitals
                </h4>
                <div>
                  <Label className="text-xs">B.P. (Blood Pressure)</Label>
                  <Input
                    value={formData.admissionBp}
                    onChange={(e) => setField("admissionBp", e.target.value)}
                    placeholder="e.g. 120/80 mmHg"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Pulse</Label>
                  <Input
                    value={formData.admissionPulse}
                    onChange={(e) => setField("admissionPulse", e.target.value)}
                    placeholder="e.g. 76 /min"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">SpO2</Label>
                  <Input
                    value={formData.admissionSpo2}
                    onChange={(e) => setField("admissionSpo2", e.target.value)}
                    placeholder="e.g. 98%"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Temperature</Label>
                  <Input
                    value={formData.admissionTemp}
                    onChange={(e) => setField("admissionTemp", e.target.value)}
                    placeholder="e.g. 98.6 °F"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Respiratory Rate</Label>
                  <Input
                    value={formData.admissionRespRate}
                    onChange={(e) => setField("admissionRespRate", e.target.value)}
                    placeholder="e.g. 18 /min"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              {/* Discharge Vitals */}
              <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
                <h4 className="font-semibold text-xs text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  At Time Discharge Vitals
                </h4>
                <div>
                  <Label className="text-xs">B.P. (Blood Pressure)</Label>
                  <Input
                    value={formData.dischargeBp}
                    onChange={(e) => setField("dischargeBp", e.target.value)}
                    placeholder="e.g. 120/80 mmHg"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Pulse</Label>
                  <Input
                    value={formData.dischargePulse}
                    onChange={(e) => setField("dischargePulse", e.target.value)}
                    placeholder="e.g. 74 /min"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">SpO2</Label>
                  <Input
                    value={formData.dischargeSpo2}
                    onChange={(e) => setField("dischargeSpo2", e.target.value)}
                    placeholder="e.g. 99%"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Temperature</Label>
                  <Input
                    value={formData.dischargeTemp}
                    onChange={(e) => setField("dischargeTemp", e.target.value)}
                    placeholder="e.g. 98.4 °F"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Respiratory Rate</Label>
                  <Input
                    value={formData.dischargeRespRate}
                    onChange={(e) => setField("dischargeRespRate", e.target.value)}
                    placeholder="e.g. 16 /min"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: Clinical Summary */}
          <TabsContent value="clinical" className="space-y-4 pt-3 flex-1 overflow-y-auto pr-2 pb-6">
            <div>
              <Label className="text-xs">Admission Time Health Condition</Label>
              <Textarea
                rows={2}
                value={formData.admissionHealthCondition}
                onChange={(e) => setField("admissionHealthCondition", e.target.value)}
                placeholder="Chief complaints, presenting symptoms..."
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Date of Admission</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      const regDate = patient.registeredAt && !isNaN(new Date(patient.registeredAt).getTime())
                        ? new Date(patient.registeredAt)
                        : new Date();
                      setField("dateOfAdmission", getLocalDateString(regDate));
                    }}
                  >
                    Today / Reg
                  </Button>
                </div>
                <Input
                  type="date"
                  value={formData.dateOfAdmission}
                  onChange={(e) => setField("dateOfAdmission", e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-emerald-700">Date of Discharge</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px] text-emerald-600 hover:text-emerald-700 font-medium"
                    onClick={() => setField("dateOfDischarge", getLocalDateString(new Date()))}
                  >
                    Today
                  </Button>
                </div>
                <Input
                  type="date"
                  value={formData.dateOfDischarge}
                  onChange={(e) => setField("dateOfDischarge", e.target.value)}
                  className="mt-1 h-8 text-xs border-emerald-300"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Any of Hospitalised Past H/O</Label>
              <Input
                value={formData.pastHospitalHistory}
                onChange={(e) => setField("pastHospitalHistory", e.target.value)}
                placeholder="Previous surgical, medical, or hospitalisation history"
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs">Discharge Time Condition</Label>
              <Textarea
                rows={2}
                value={formData.dischargeTimeCondition}
                onChange={(e) => setField("dischargeTimeCondition", e.target.value)}
                placeholder="Patient general condition at discharge..."
                className="mt-1 text-xs"
              />
            </div>
          </TabsContent>

          {/* TAB 4: Treatment & Status */}
          <TabsContent value="treatment" className="space-y-4 pt-3 flex-1 overflow-y-auto pr-2 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Given Total Treatment</Label>
                <Textarea
                  rows={4}
                  value={formData.givenTotalTreatment}
                  onChange={(e) => setField("givenTotalTreatment", e.target.value)}
                  placeholder="Medications, IV fluids, injections, surgery or interventions performed..."
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Investigations</Label>
                <Textarea
                  rows={4}
                  value={formData.investigations}
                  onChange={(e) => setField("investigations", e.target.value)}
                  placeholder="CBC, X-Ray, ECG, USG, Culture, Biochemical reports..."
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div>
                <Label className="text-xs font-semibold">Condition of Patient When Admission</Label>
                <select
                  value={formData.conditionAtAdmission}
                  onChange={(e) => setField("conditionAtAdmission", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background mt-1"
                >
                  <option value="">-- Select Condition --</option>
                  <option value="WEEKNESS">WEEKNESS</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="POOR">POOR</option>
                  <option value="COMPLITLY ON BED">COMPLITLY ON BED</option>
                  <option value="ACCIDENTAL">ACCIDENTAL</option>
                  <option value="SERIOUS">SERIOUS</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Condition of Patient at Discharge</Label>
                <select
                  value={formData.conditionAtDischarge}
                  onChange={(e) => setField("conditionAtDischarge", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background mt-1 font-medium text-emerald-700"
                >
                  <option value="">-- Select Condition --</option>
                  <option value="BETTER">BETTER</option>
                  <option value="GOOD">GOOD</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="POOR">POOR</option>
                  <option value="WEEK">WEEK</option>
                  <option value="COMPLITLY ON BED">COMPLITLY ON BED</option>
                  <option value="DEATH">DEATH</option>
                </select>
              </div>
            </div>

            {formData.conditionAtDischarge === "DEATH" && (
              <div>
                <Label className="text-xs text-red-600 font-semibold">Cause of Death</Label>
                <Input
                  value={formData.causeOfDeath}
                  onChange={(e) => setField("causeOfDeath", e.target.value)}
                  placeholder="Specify primary/secondary cause of death"
                  className="mt-1 text-xs border-red-300"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <Label className="text-xs">Follow-Up After (Days)</Label>
                <Input
                  value={formData.followUpDays}
                  onChange={(e) => setField("followUpDays", e.target.value)}
                  placeholder="e.g. 3, 5, 7"
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Follow-Up Date</Label>
                <Input
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => setField("followUpDate", e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <Label className="text-xs">Relative (1) Name</Label>
                <Input
                  value={formData.relative1Name}
                  onChange={(e) => setField("relative1Name", e.target.value)}
                  placeholder="Relative name for signature"
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Relative (2) Name (Opt)</Label>
                <Input
                  value={formData.relative2Name}
                  onChange={(e) => setField("relative2Name", e.target.value)}
                  placeholder="Second relative name if any"
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-auto flex flex-col-reverse sm:flex-row gap-2 border-t pt-2.5 sm:pt-3 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-auto">
            Cancel
          </Button>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              onClick={() => requestDischarge(true)}
              disabled={isSubmitting}
              className="h-8 sm:h-9 text-xs sm:text-sm gap-1.5 w-full sm:w-auto"
            >
              <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" />
              <span>Save &amp; Print Discharge Card</span>
            </Button>

            <Button
              onClick={() => requestDischarge(false)}
              disabled={isSubmitting}
              className="h-8 sm:h-9 text-xs sm:text-sm bg-amber-600 hover:bg-amber-700 text-white gap-1.5 font-medium w-full sm:w-auto"
            >
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Complete Discharge</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Confirmation Modal when empty fields exist */}
    <AlertDialog open={showConfirmEmpty} onOpenChange={setShowConfirmEmpty}>
      <AlertDialogContent className="z-[70] max-w-lg border-amber-500/30">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <span>ખાલી ફિલ્ડ્સ સાથે ડિસ્ચાર્જ કન્ફર્મ કરો / Confirm Discharge</span>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2 text-xs">
              <p className="text-foreground/90 font-medium">
                દર્દી <strong>{patient.name}</strong> ({patient.code}) ના ડિસ્ચાર્જ કાર્ડમાં હજુ કુલ{" "}
                <strong className="text-amber-600 dark:text-amber-400 font-bold">{totalEmpty} ફિલ્ડ ખાલી</strong> છે:
              </p>

              <div className="bg-muted/50 rounded-md p-3 border space-y-1.5">
                <div className="flex justify-between">
                  <span>1. Demographics:</span>
                  <strong className={t1Empty > 0 ? "text-amber-600 font-semibold" : "text-emerald-600"}>
                    {t1Empty > 0 ? `${t1Empty} empty` : "Completed ✓"}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>2. Vitals Comparison:</span>
                  <strong className={t2Empty > 0 ? "text-amber-600 font-semibold" : "text-emerald-600"}>
                    {t2Empty > 0 ? `${t2Empty} empty` : "Completed ✓"}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>3. Clinical Summary:</span>
                  <strong className={t3Empty > 0 ? "text-amber-600 font-semibold" : "text-emerald-600"}>
                    {t3Empty > 0 ? `${t3Empty} empty` : "Completed ✓"}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>4. Treatment &amp; Status:</span>
                  <strong className={t4Empty > 0 ? "text-amber-600 font-semibold" : "text-emerald-600"}>
                    {t4Empty > 0 ? `${t4Empty} empty` : "Completed ✓"}
                  </strong>
                </div>
              </div>

              <p className="text-muted-foreground">
                શું તમે આ ફિલ્ડ્સ ખાલી રાખીને ડિસ્ચાર્જ પૂર્ણ કરવા માંગો છો? જો વિગતો ભરવી હોય તો &apos;Review &amp; Fill&apos; પર ક્લિક કરો.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel onClick={() => setShowConfirmEmpty(false)}>
            પાછા જાઓ (Review &amp; Fill)
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setShowConfirmEmpty(false);
              executeDischarge(pendingPrint);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
          >
            હા, ડિસ્ચાર્જ કન્ફર્મ કરો (Yes, Confirm)
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
