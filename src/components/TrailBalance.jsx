import React, { useEffect, useState, useRef } from "react";
import API from "../api.js";
import { formatCurrency } from "../utils/helpers"; // Utility to format currency
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
const TrialBalance = ({companyAddress,companyName,email, phone, refNum}) => {
  const [trialBalanceData, setTrialBalanceData] = useState([]);
  const [expandedParents, setExpandedParents] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("detailed"); // 'detailed' or 'net' mode
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const trialBalanceRef = useRef(null); // Reference to the table for PDF capture
  const fetchTrialBalance = async () => {
    try {
      setLoading(true);
      const response = await API.get("/reports/trial-balance", {
        params: { from_date: fromDate, to_date: toDate },
      });
      setTrialBalanceData(response.data);
    } catch (err) {
      setError("Failed to load trial balance data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchTrialBalance();
  }, [toDate, fromDate, setFromDate, setToDate]);

  const handleApplyFilter = () => {
    fetchTrialBalance();
  };
  
  const handleDownloadPDF = () => {
    // Expand all parent accounts before capturing the PDF
    const allExpanded = Object.keys(groupedAccounts).reduce((acc, parentId) => {
      acc[parentId] = true;
      return acc;
    }, {});
    setExpandedParents(allExpanded);
    
    // Allow time for UI to update before capturing the PDF
    setTimeout(async () => {
      const input = trialBalanceRef.current;
      
      // PDF dimensions and margins
      const pdfMargin = 15; // margin in mm
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const contentWidth = pageWidth - (pdfMargin * 2);
      const contentHeight = pageHeight - (pdfMargin * 2);
      
      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4");
      
      // Add company header to first page (only)
      const addCompanyHeader = async () => {
        // Create a temporary div with the header
        const headerDiv = document.createElement('div');
        headerDiv.innerHTML = `
          <div style="display: flex; justify-content: space-between; padding-bottom: 1rem;  border-bottom: 1px solid #e2e8f0;">
            <div>
              <h1 style="font-size: 3rem; font-weight: bold; color: #2563eb; margin-bottom: 0.25rem;">
                ${companyName || "Company Name"}
              </h1>
              <p style="font-size: 1.2rem; color: #4b5563;">
                ${companyAddress || "123 Business St, City, Country"}
              </p>
              <p style="font-size: 1rem; color: #4b5563;">
                Email: ${email || "support@company.com"} | Phone: ${phone || "(123) 456-7890"}
              </p>
              <p style="font-size: 1rem; color: #4b5563;">
                Date: <span style="font-weight: 500;">${new Date().toLocaleDateString()}</span>
              </p>
            </div>
            <div>
              <img src="images/logo.png" alt="Company Logo" style="height: 10rem; width: auto;">
            </div>
            </div>
             <div style="margin-bottom: 8rem;"; >
              <h2 style="font-size: 2rem; color: #4b5563;">Trial Balance</h2>
            </div>
          </div>
        `;
        document.body.appendChild(headerDiv);
        
        try {
          const headerCanvas = await html2canvas(headerDiv, { scale: 2 });
          document.body.removeChild(headerDiv);
          
          const headerImgData = headerCanvas.toDataURL('image/png');
          const headerImgWidth = contentWidth;
          const headerImgHeight = (headerCanvas.height * headerImgWidth) / headerCanvas.width;
          
          pdf.addImage(
            headerImgData,
            'PNG',
            pdfMargin,
            pdfMargin,
            headerImgWidth,
            headerImgHeight,
            '',
            'FAST'
          );
          
          return headerImgHeight + 5; // Adding a small gap (in mm)
        } catch (error) {
          console.error("Error generating header:", error);
          document.body.removeChild(headerDiv);
          return 0;
        }
      };
      
      // Add the regular header on subsequent pages
      const addPageHeader = (pageNum) => {
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("Trial Balance Report", pageWidth / 2, pdfMargin - 5, { align: "center" });
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Page ${pageNum}`, pageWidth - pdfMargin, pdfMargin - 5, { align: "right" });
        pdf.setDrawColor(200, 200, 200);
        pdf.line(pdfMargin, pdfMargin - 2, pageWidth - pdfMargin, pdfMargin - 2);
      };
      
      // Add the footer on each page
      const addFooter = () => {
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setDrawColor(200, 200, 200);
        pdf.line(pdfMargin, pageHeight - pdfMargin + 2, pageWidth - pdfMargin, pageHeight - pdfMargin + 2);
        pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pdfMargin, pageHeight - pdfMargin + 7);
      };
      
      // First capture the full table content
      const tableCanvas = await html2canvas(input, { scale: 2, scrollY: -window.scrollY });
      const tableImgData = tableCanvas.toDataURL("image/png");
      
      // Add the company header to the first page and get its height
      const headerHeightMM = await addCompanyHeader();
      
      // Calculate the scaling from canvas pixels to PDF mm
      const pdfImgWidth = contentWidth;
      const pdfImgHeight = (tableCanvas.height * pdfImgWidth) / tableCanvas.width;
      const scaleFactor = tableCanvas.width / pdfImgWidth; // pixels per mm
      
      // Calculate available content height on first page (in mm)
      const firstPageAvailableHeight = contentHeight - headerHeightMM;
      
      // Convert to equivalent canvas pixels for slicing
      const firstPagePixelHeight = firstPageAvailableHeight * scaleFactor;
      
      // Create a canvas for the first page content
      const firstPageCanvas = document.createElement("canvas");
      const firstPageCtx = firstPageCanvas.getContext("2d");
      firstPageCanvas.width = tableCanvas.width;
      firstPageCanvas.height = firstPagePixelHeight;
      
      // Draw the first slice on the canvas
      firstPageCtx.drawImage(
        tableCanvas,
        0, 0, tableCanvas.width, firstPagePixelHeight,
        0, 0, tableCanvas.width, firstPagePixelHeight
      );
      
      // Add the first page content below the header
      const firstPageImgData = firstPageCanvas.toDataURL("image/png");
      pdf.addImage(
        firstPageImgData,
        'PNG',
        pdfMargin,
        pdfMargin + headerHeightMM,
        pdfImgWidth,
        firstPageAvailableHeight,
        '',
        'FAST'
      );
      
      // Add footer to first page
      addFooter();
      
      // Calculate remaining content height in pixels
      const remainingContentHeight = tableCanvas.height - firstPagePixelHeight;
      
      // Calculate number of additional pages needed
      const contentHeightPixels = contentHeight * scaleFactor;
      const additionalPages = Math.ceil(remainingContentHeight / contentHeightPixels);
      
      // Process remaining pages
      for (let i = 0; i < additionalPages; i++) {
        pdf.addPage();
        
        // Add header and footer
        addPageHeader(i + 2); // page numbers start from 2
        addFooter();
        
        // Calculate source area from original canvas
        const sourceY = firstPagePixelHeight + (i * contentHeightPixels);
        const sourceHeight = Math.min(contentHeightPixels, tableCanvas.height - sourceY);
        
        // Create a temporary canvas for the current slice
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        tempCanvas.width = tableCanvas.width;
        tempCanvas.height = sourceHeight;
        
        // Draw the slice on the temporary canvas
        tempCtx.drawImage(
          tableCanvas,
          0, sourceY, tableCanvas.width, sourceHeight,
          0, 0, tableCanvas.width, sourceHeight
        );
        
        // Get the image data and calculate dimensions
        const sliceImgData = tempCanvas.toDataURL("image/png");
        const sliceHeight = (sourceHeight / scaleFactor); // convert back to mm
        
        // Add the image to the PDF
        pdf.addImage(
          sliceImgData,
          'PNG',
          pdfMargin,
          pdfMargin,
          pdfImgWidth,
          sliceHeight,
          '',
          'FAST'
        );
      }
      
      pdf.save("Trial_Balance.pdf");
    }, 500); // Delay to allow UI update
  };  
  

  const toggleParent = (parentId) => {
    setExpandedParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  // Separate parent and child accounts
  const groupedAccounts = trialBalanceData.reduce((acc, account) => {
    if (account.parent_account_id) {
      if (!acc[account.parent_account_id]) acc[account.parent_account_id] = [];
      acc[account.parent_account_id].push(account);
    } else {
      acc[account.id] = acc[account.id] || [];
    }
    return acc;
  }, {});

  // Calculate aggregated balances for parent accounts
  const getParentAggregatedBalances = (parentId) => {
    const children = groupedAccounts[parentId] || [];
    if (children.length === 0) {
      // If no children, return the parent's actual balance
      const parent = trialBalanceData.find(
        (acc) => acc.id === parseInt(parentId)
      );
      return {
        totalDebit: parent?.debit || 0,
        totalCredit: parent?.credit || 0,
      };
    }

    const totalDebit = children.reduce(
      (total, child) => total + (child.debit || 0),
      0
    );
    const totalCredit = children.reduce(
      (total, child) => total + (child.credit || 0),
      0
    );
    return { totalDebit, totalCredit };
  };

  const totalDebit = trialBalanceData.reduce(
    (total, entry) => total + (entry.debit || 0),
    0
  );
  const totalCredit = trialBalanceData.reduce(
    (total, entry) => total + (entry.credit || 0),
    0
  );
  const netBalance = totalDebit - totalCredit;

  return (
    <div  className="max-w-4xl mx-auto p-6 bg-white shadow rounded-md max-h-[calc(100vh-100px)] overflow-y-scroll">
      <h2 className="text-2xl font-bold mb-6">Trial Balance</h2>
      {/* Date Filters */}
      <div  className="flex gap-4 mb-4">
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="border p-2 rounded"
        />
        {/* <button onClick={handleApplyFilter} className="px-4 py-2 bg-blue-500 text-white rounded">Apply</button> */}
      </div>
      {/* Print Button */}
      <button
        onClick={handleDownloadPDF}
        className="mb-4 px-4 py-2 bg-green-500 text-white rounded"
      >
        Print Trial Balance
      </button>

      {/* View Mode Toggle */}
      <div className="mb-4 flex gap-2">
        <button
          className={`px-4 py-2 ${
            viewMode === "detailed" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
          onClick={() => setViewMode("detailed")}
        >
          Detailed View
        </button>
        <button
          className={`px-4 py-2 ${
            viewMode === "net" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
          onClick={() => setViewMode("net")}
        >
          Net Balance View
        </button>
      </div>

      {/* Table */}
      <table ref={trialBalanceRef} className="min-w-full table-auto border-collapse">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-4 py-2 text-left">Account Name</th>
            {viewMode === "detailed" ? (
              <>
                <th className="px-4 py-2 text-right">Debit</th>
                <th className="px-4 py-2 text-right">Credit</th>
              </>
            ) : (
              <th className="px-4 py-2 text-right">Net Balance</th>
            )}
          </tr>
        </thead>
        <tbody>
          {Object.keys(groupedAccounts).length > 0 ? (
            Object.keys(groupedAccounts).map((parentId) => {
              const parentAccount = trialBalanceData.find(
                (acc) => acc.id === parseInt(parentId)
              );

              if (!parentAccount) {
                console.warn(
                  `Parent account with ID ${parentId} not found in trialBalanceData.`
                );
                return null; // Skip if the parent account doesn't exist
              }

              const childAccounts = groupedAccounts[parentId];
              const aggregatedBalances = getParentAggregatedBalances(parentId);

              return (
                <React.Fragment key={parentId}>
                  {/* Parent Row */}
                  <tr
                    className="cursor-pointer bg-gray-100"
                    onClick={() => toggleParent(parentId)}
                  >
                    <td className="px-4 py-2">
                      <span>
                        {expandedParents[parentId] ? "▼" : "▶"}{" "}
                        {parentAccount.account_name}
                      </span>
                    </td>
                    {viewMode === "detailed" ? (
                      <>
                        <td className="px-4 py-2 text-right">
                          {formatCurrency(aggregatedBalances.totalDebit)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatCurrency(aggregatedBalances.totalCredit)}
                        </td>
                      </>
                    ) : (
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(
                          aggregatedBalances.totalDebit -
                            aggregatedBalances.totalCredit
                        )}
                      </td>
                    )}
                  </tr>

                  {/* Child Rows */}
                  {expandedParents[parentId] &&
                    childAccounts.map((child) => (
                      <tr key={child.account_name} className="border-b">
                        <td className="px-4 py-2 pl-8">{child.account_name}</td>
                        {viewMode === "detailed" ? (
                          <>
                            <td className="px-4 py-2 text-right">
                              {formatCurrency(child.debit || 0)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {formatCurrency(child.credit || 0)}
                            </td>
                          </>
                        ) : (
                          <td className="px-4 py-2 text-right">
                            {formatCurrency(
                              (child.debit || 0) - (child.credit || 0)
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                </React.Fragment>
              );
            })
          ) : (
            <tr>
              <td colSpan="3" className="text-center py-4">
                No trial balance data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-6 font-bold text-lg">
        {viewMode === "detailed" ? (
          <>
            <div className="flex justify-between">
              <span>Total Debit</span>
              <span>{formatCurrency(totalDebit)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Credit</span>
              <span>{formatCurrency(totalCredit)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span>Net Balance</span>
            <span
              className={`${
                netBalance === 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatCurrency(netBalance)}
            </span>
          </div>
        )}
      </div>

      {/* Trial Balance Status */}
      <div className="mt-4">
        <span
          className={`text-lg font-bold ${
            Math.round(netBalance) === 0 ? "text-green-500" : "text-red-500"
          }`}
        >
          {Math.round(netBalance) === 0
            ? "Trial Balance is Balanced"
            : `Trial Balance is Unbalanced: ${formatCurrency(netBalance)}`}
        </span>
      </div>
    </div>
  );
};

export default TrialBalance;
