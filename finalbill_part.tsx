function FinalBillDialog({ patient, onClose, settings }: { patient: Patient; onClose: () => void; settings: any }) {
  const db = useDB();
  const [items, setItems] = useState<any[]>([{ description: "", itemReceiptNo: "1", charges: 0, totalCharges: 0 }]);
  const [receiptNo, setReceiptNo] = useState(`IPD-${patient.id}-${Date.now().toString().slice(-4)}`);
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [dischargeDate, setDischargeDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [printData, setPrintData] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  

  const fetchHistory = async () => {
    try {
      const data = await apiService.finalBills.getByPatientId(patient.id);
      setHistory(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [patient.id]);

  const addItem = () => setItems([...items, { description: "", itemReceiptNo: "1", charges: 0, totalCharges: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, val: any) => {
    const newItems = [...items];
    newItems[i] = { ...newItems[i], [field]: val };
    
    if (field === "description") {
        const charge = db.charges.find(c => c.name === val);
        if (charge) {
            newItems[i].charges = charge.amount;
            newItems[i].totalCharges = charge.amount * (Number(newItems[i].itemReceiptNo) || 1);
        }
    } else if (field === "itemReceiptNo") {
        newItems[i].totalCharges = (Number(newItems[i].charges) || 0) * (Number(val) || 1);
    } else if (field === "charges") {
        newItems[i].totalCharges = (Number(val) || 0) * (Number(newItems[i].itemReceiptNo) || 1);
    }
    setItems(newItems);
  };

  const finalDepositAmount = items.reduce((sum, it) => sum + (Number(it.totalCharges) || 0), 0);
  const discountAmount = 0; 
  const netAmount = finalDepositAmount - discountAmount;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        patientId: patient.id,
        receiptNo,
        billDate,
        dischargeDate: dischargeDate ? new Date(dischargeDate).toISOString() : null,
        ward: patient.ward || "General",
        bedCategory: patient.wardNumber ? `General/${patient.wardNumber}` : "General",
        totalAmount: finalDepositAmount,
        
        discountAmount: discountAmount,
        netAmount,
        items: items.filter(it => it.description.trim() !== "").map(it => ({
            description: it.description,
            daysQty: Number(it.itemReceiptNo) || 1,
            charges: Number(it.charges) || 0,
            totalCharges: Number(it.totalCharges) || 0
        }))
      };

      const res = await apiService.finalBills.create(payload);
      toast.success("Case Bill saved successfully");
      await fetchHistory();
      setPrintData(res);
    } catch (e: any) {
      toast.error("Failed to save Case Bill");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    let printIframe = document.getElementById("print-iframe") as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement("iframe");
      printIframe.id = "print-iframe";
      printIframe.style.position = "absolute";
      printIframe.style.width = "0";
      printIframe.style.height = "0";
      printIframe.style.border = "none";
      document.body.appendChild(printIframe);
    }
    const printWindow = printIframe.contentWindow;
    if (!printWindow) return;

    const htmlContent = renderToString(
      <FinalBillPrintTemplate data={printData} patient={patient} settings={settings} />
    );

    printWindow.document.write(`
      <html>
        <head>
          <title>IPD Case Bill — ${patient.name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page { margin: 0; }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 0; margin: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); }, 500)">
          ${htmlContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>IPD Case Bill for {patient.name}</DialogTitle>
        </DialogHeader>

        {printData ? (
            <div className="space-y-4">
                <div className="border p-4 bg-white text-black overflow-x-auto">
                    <FinalBillPrintTemplate data={printData} patient={patient} settings={settings} />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setPrintData(null)}>Back</Button>
                    <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print Bill</Button>
                </div>
            </div>
        ) : (
            <div className="space-y-4">
                {history.length > 0 && (
                    <div className="border rounded-md p-4 bg-muted/20">
                        <h3 className="font-semibold text-sm mb-2">Past Case Bills</h3>
                        <div className="space-y-2">
                            {history.map((h, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 border bg-background rounded text-sm">
                                    <div>
                                        <span className="font-medium">{h.receiptNo}</span> - {new Date(h.billDate).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-semibold text-red-600">₹ {h.netAmount}</span>
                                        <Button variant="outline" size="sm" onClick={() => setPrintData(h)}>
                                            <Printer className="h-4 w-4 mr-2" /> View
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <h3 className="font-semibold text-sm border-b pb-2">New Case Bill</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <Label className="text-xs">Receipt No</Label>
                        <Input value={receiptNo} readOnly className="h-8 text-sm bg-muted cursor-not-allowed text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Bill Date</Label>
                        <Input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Discharge Date (Opt)</Label>
                        <Input type="date" value={dischargeDate} onChange={e => setDischargeDate(e.target.value)} className="h-8 text-sm" />
                    </div>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">No</TableHead>
                                <TableHead>Particular Procedure</TableHead>
                                <TableHead className="w-[120px]">Days / Qty</TableHead>
                                <TableHead className="w-[120px]">Charges</TableHead>
                                <TableHead className="w-[120px]">Total Charges</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((it, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{idx + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Select value={it.description} onValueChange={v => updateItem(idx, "description", v)}>
                                                <SelectTrigger className="h-8 flex-1">
                                                    <SelectValue placeholder="Select procedure" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {db.charges.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <Input value={it.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Custom..." className="h-8 w-1/3 hidden" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" value={it.itemReceiptNo} onChange={e => updateItem(idx, "itemReceiptNo", e.target.value)} placeholder="1" className="h-8" />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" value={it.charges} onChange={e => updateItem(idx, "charges", e.target.value)} className="h-8" />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" value={it.totalCharges} onChange={e => updateItem(idx, "totalCharges", e.target.value)} className="h-8" />
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8 text-red-500 hover:text-red-600"><Trash className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <Button variant="outline" size="sm" onClick={addItem} className="w-full"><Plus className="h-4 w-4 mr-2" /> Add Row</Button>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || items.length === 0}>Save & Generate Bill</Button>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const FinalBillPrintTemplate = ({ data, patient, settings }: any) => {
    return (
        <div className="p-8 w-full max-w-[800px] mx-auto text-black font-sans print:p-0 print:border-none relative z-0" style={{ fontSize: "12px", minHeight: "297mm" }}>
            {/* Watermark Logo */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.10] -z-10 pointer-events-none flex justify-center items-center w-full">
                {settings?.logoUrl && <img src={settings.logoUrl} alt="Watermark" className="w-[80%] max-w-[600px] object-contain -rotate-12" />}
            </div>

            {/* Main Content Wrapper for z-index */}
            <div className="relative">
                {/* Header Section */}
            <div className="bg-[#4b4b4b] mx-5 mt-5 mb-8 rounded-[40px] flex items-center justify-between h-[120px] relative print:bg-[#4b4b4b] print:border print:border-black">
              <div className="bg-white h-full w-[calc(100%-180px)] rounded-l-[40px] flex items-center justify-start p-0 box-border border border-black print:border-black">
                {settings?.logoUrl && <img src={settings.logoUrl} alt="Hospital Logo" className="w-full h-full rounded-l-[40px] object-fill" />}
              </div>
              <div className="bg-white w-[150px] h-[150px] rounded-full absolute right-5 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center shadow-[0_4px_10px_rgba(0,0,0,0.15)] z-10 border border-black print:border-black">
                <span className="text-sm mb-1 text-[#e53e3e]">Help Line :</span>
                <span className="text-lg font-bold text-[#e53e3e]">{settings?.helpline || 'N/A'}</span>
              </div>
            </div>

            {/* Patient Info & Receipt Details */}
            <div className="border border-black p-2 text-[11px] mb-6 uppercase flex flex-row relative z-10 bg-transparent">
                {/* Left side: Patient Info */}
                <div className="w-2/3 pr-4 border-r border-black space-y-2 text-black">
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dotted border-black pb-1">Pt.NAME - <span className="font-semibold">{patient.name}</span></div>
                        <div className="w-48 border-b border-dotted border-black pb-1">AGE / GENDER - <span className="font-semibold">{patient.age} / {patient.gender}</span></div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dotted border-black pb-1">Dr. IN-CHARGE - <span className="font-semibold">{patient.doctor || ""}</span></div>
                        <div className="w-48 border-b border-dotted border-black pb-1">ADDMITION - <span className="font-semibold">{new Date(patient.registeredAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dotted border-black pb-1">ADDRESH - <span className="font-semibold">{patient.city}</span></div>
                        <div className="w-48 border-b border-dotted border-black pb-1">DISEASE - </div>
                    </div>
                </div>
                {/* Right side: Admission / Receipt Info */}
                <div className="w-1/3 pl-4 text-[10px] leading-tight space-y-1 text-black font-semibold">
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Admission No</span> <span>- {patient.code}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Indoor No</span> <span>- {patient.code}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">RECEIPT No</span> <span>- {data.receiptNo}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Bill Date</span> <span>- {new Date(data.billDate).toLocaleDateString('en-GB')}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Discharge Date</span> <span>- {data.dischargeDate ? new Date(data.dischargeDate).toLocaleDateString('en-GB') : "Pending"}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Ward</span> <span>- {data.ward}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Bed Category</span> <span>- {data.bedCategory}</span></div>
                </div>
            </div>

            {/* Title */}
            <div className="text-center font-bold text-red-600 text-[13px] py-1 mb-2 tracking-wider border border-black bg-transparent">
                IPD FINAL CASE BILL
            </div>

            {/* Table */}
            <div className="border border-black mb-2 relative z-10 bg-transparent text-black">
                <table className="w-full text-[11px] border-collapse bg-transparent text-black border border-black print:border-black">
                    <thead>
                        <tr className="text-red-600 border-b border-black">
                            <th className="w-10 py-1 text-left px-2 font-normal border-r border-black print:border-black">NO</th>
                            <th className="py-1 text-left px-2 font-normal border-r border-black print:border-black">Particular Procedure</th>
                            <th className="w-24 py-1 text-center px-2 font-normal border-r border-black print:border-black">Days / Qty</th>
                            <th className="w-24 py-1 text-center px-2 font-normal border-r border-black print:border-black">Charges</th>
                            <th className="w-28 py-1 text-center px-2 font-normal">Total Charges</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((it: any, idx: number) => (
                            <tr key={idx}>
                                <td className="px-2 py-1 align-top text-black print:text-black border-r border-black print:border-black underline">{idx + 1}</td>
                                <td className="px-2 py-1 font-semibold text-black print:text-black border-r border-black print:border-black">{it.description}</td>
                                <td className="px-2 py-1 text-center text-black print:text-black border-r border-black print:border-black">{it.daysQty}</td>
                                <td className="px-2 py-1 text-center text-black print:text-black border-r border-black print:border-black">{it.charges}</td>
                                <td className="px-2 py-1 text-center text-black print:text-black">{it.totalCharges}</td>
                            </tr>
                        ))}
                        {/* Minimum height filler rows */}
                        {[...Array(Math.max(0, 8 - data.items.length))].map((_, i) => (
                            <tr key={`empty-${i}`}>
                                <td className="px-2 py-3 border-r border-black print:border-black"></td>
                                <td className="px-2 py-3 border-r border-black print:border-black"></td>
                                <td className="px-2 py-3 border-r border-black print:border-black"></td>
                                <td className="px-2 py-3 border-r border-black print:border-black"></td>
                                <td className="px-2 py-3"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals Section */}
            <div className="flex border border-black mb-2 text-[11px] relative z-10 bg-transparent">
                <div className="w-1/2 p-2 border-r border-black space-y-1 text-red-600 print:text-red-600">
                    <div className="font-bold mb-1 uppercase text-black">Bank Details</div>
                    <div className="grid grid-cols-[110px_1fr]"><span>Account Name</span> <span>— {settings?.bankAccountName || 'Lifecare Hospital'}</span></div>
                    <div className="grid grid-cols-[110px_1fr]"><span>A / C No</span> <span>— {settings?.bankAccountNumber || '-'}</span></div>
                    <div className="grid grid-cols-[110px_1fr]"><span>BANK NAME</span> <span>— {settings?.bankName || '-'}</span></div>
                    <div className="grid grid-cols-[110px_1fr]"><span>IFSE Code</span> <span>— {settings?.bankIfscCode || '-'}</span></div>
                </div>
                <div className="w-1/2 p-2 flex flex-col justify-center space-y-2 text-red-600 font-bold print:text-red-600">
                    <div className="flex justify-between items-center pr-4">
                        <span>Total Amount</span>
                        <span>=</span>
                        <span className="w-24 text-right">{data.totalAmount.toLocaleString('en-IN')} /-</span>
                    </div>
                    <div className="flex justify-between items-center pr-4">
                        <span>Discount Amount</span>
                        <span>=</span>
                        <span className="w-24 text-right">{data.discountAmount > 0 ? data.discountAmount.toLocaleString('en-IN') : "-"}</span>
                    </div>
                    <div className="flex justify-between items-center pr-4 pt-2 border-t border-red-200 print:border-red-600">
                        <span>Net Amount</span>
                        <span>=</span>
                        <span className="w-24 text-right text-lg">{data.netAmount.toLocaleString('en-IN')} /-</span>
                    </div>
                </div>
            </div>
            
            <div className="border border-black p-2 text-[11px] font-semibold mb-6 text-black relative z-10 bg-transparent">
                Amount In Words — <span className="font-normal capitalize text-black">{numberToWords.toWords(data.netAmount)} Only.</span>
            </div>

            {/* Signatures */}
            <div className="flex justify-between mt-16 px-4 text-[11px] font-semibold text-black">
                <div className="border-b border-black pb-1 px-4 text-black">RELATIVE / PATIENT SIGNETURE</div>
                <div className="border-b border-black pb-1 px-4 text-black">AUTHORISED SIGNATURE</div>
            </div>
            </div>
        </div>
    );
};
