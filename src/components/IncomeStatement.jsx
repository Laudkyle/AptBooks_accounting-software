import React, { useEffect, useState, useRef } from "react";
import API from "../api.js";
import { jsPDF } from "jspdf";
import { formatCurrency } from "../utils/helpers"; // Utility to format currency

import html2canvas from "html2canvas";
const IncomeStatement = ({ companyAddress, companyName, email, phone }) => {
  const [incomeStatementData, setIncomeStatementData] = useState({
    revenue: [],
    expenses: [],
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const IncomeStatementRef = useRef(null); // Reference to the table for PDF capture

  // Set default dates to current month
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    setFromDate(firstDay.toISOString().split("T")[0]);
    setToDate(lastDay.toISOString().split("T")[0]);
  }, []);


  const handleDownloadPDF = () => {
    // Expand all parent accounts before capturing the PDF

    // Allow time for UI to update before capturing the PDF
    setTimeout(async () => {
      const input = IncomeStatementRef.current;

      // PDF dimensions and margins
      const pdfMargin = 15; // margin in mm
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const contentWidth = pageWidth - pdfMargin * 2;
      const contentHeight = pageHeight - pdfMargin * 2;

      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4");

      // Add company header to first page (only)
      const addCompanyHeader = async () => {
        // Create a temporary div with the header
        const headerDiv = document.createElement("div");
        headerDiv.innerHTML = `
          <div style="display: flex; justify-content: space-between; padding-bottom: 1rem; margin-bottom: 1rem; border-bottom: 1px solid #e2e8f0;">
            <div>
              <h1 style="font-size: 3rem; font-weight: bold; color: #2563eb; margin-bottom: 0.25rem;">
                ${companyName || "Company Name"}
              </h1>
              <p style="font-size: 1.2rem; color: #4b5563;">
                ${companyAddress || "123 Business St, City, Country"}
              </p>
              <p style="font-size: 1rem; color: #4b5563;">
                Email: ${email || "support@company.com"} | Phone: ${
          phone || "(123) 456-7890"
        }
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
              <h2 style="font-size: 2rem; color: #4b5563;">Income Statement</h2>
            </div>
          </div>
        `;
        document.body.appendChild(headerDiv);

        try {
          const headerCanvas = await html2canvas(headerDiv, { scale: 2 });
          document.body.removeChild(headerDiv);

          const headerImgData = headerCanvas.toDataURL("image/png");
          const headerImgWidth = contentWidth;
          const headerImgHeight =
            (headerCanvas.height * headerImgWidth) / headerCanvas.width;

          pdf.addImage(
            headerImgData,
            "PNG",
            pdfMargin,
            pdfMargin,
            headerImgWidth,
            headerImgHeight,
            "",
            "FAST"
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
        pdf.text("Income Statement Report", pageWidth / 2, pdfMargin - 5, {
          align: "center",
        });
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Page ${pageNum}`, pageWidth - pdfMargin, pdfMargin - 5, {
          align: "right",
        });
        pdf.setDrawColor(200, 200, 200);
        pdf.line(
          pdfMargin,
          pdfMargin - 2,
          pageWidth - pdfMargin,
          pdfMargin - 2
        );
      };

      // Add the footer on each page
      const addFooter = () => {
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setDrawColor(200, 200, 200);
        pdf.line(
          pdfMargin,
          pageHeight - pdfMargin + 2,
          pageWidth - pdfMargin,
          pageHeight - pdfMargin + 2
        );
        pdf.text(
          `Generated on: ${new Date().toLocaleDateString()}`,
          pdfMargin,
          pageHeight - pdfMargin + 7
        );
      };

      // First capture the full table content
      const tableCanvas = await html2canvas(input, {
        scale: 2,
        scrollY: -window.scrollY,
      });
      const tableImgData = tableCanvas.toDataURL("image/png");

      // Add the company header to the first page and get its height
      const headerHeightMM = await addCompanyHeader();

      // Calculate the scaling from canvas pixels to PDF mm
      const pdfImgWidth = contentWidth;
      const pdfImgHeight =
        (tableCanvas.height * pdfImgWidth) / tableCanvas.width;
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
        0,
        0,
        tableCanvas.width,
        firstPagePixelHeight,
        0,
        0,
        tableCanvas.width,
        firstPagePixelHeight
      );

      // Add the first page content below the header
      const firstPageImgData = firstPageCanvas.toDataURL("image/png");
      pdf.addImage(
        firstPageImgData,
        "PNG",
        pdfMargin,
        pdfMargin + headerHeightMM,
        pdfImgWidth,
        firstPageAvailableHeight,
        "",
        "FAST"
      );

      // Add footer to first page
      addFooter();

      // Calculate remaining content height in pixels
      const remainingContentHeight = tableCanvas.height - firstPagePixelHeight;

      // Calculate number of additional pages needed
      const contentHeightPixels = contentHeight * scaleFactor;
      const additionalPages = Math.ceil(
        remainingContentHeight / contentHeightPixels
      );

      // Process remaining pages
      for (let i = 0; i < additionalPages; i++) {
        pdf.addPage();

        // Add header and footer
        addPageHeader(i + 2); // page numbers start from 2
        addFooter();

        // Calculate source area from original canvas
        const sourceY = firstPagePixelHeight + i * contentHeightPixels;
        const sourceHeight = Math.min(
          contentHeightPixels,
          tableCanvas.height - sourceY
        );

        // Create a temporary canvas for the current slice
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        tempCanvas.width = tableCanvas.width;
        tempCanvas.height = sourceHeight;

        // Draw the slice on the temporary canvas
        tempCtx.drawImage(
          tableCanvas,
          0,
          sourceY,
          tableCanvas.width,
          sourceHeight,
          0,
          0,
          tableCanvas.width,
          sourceHeight
        );

        // Get the image data and calculate dimensions
        const sliceImgData = tempCanvas.toDataURL("image/png");
        const sliceHeight = sourceHeight / scaleFactor; // convert back to mm

        // Add the image to the PDF
        pdf.addImage(
          sliceImgData,
          "PNG",
          pdfMargin,
          pdfMargin,
          pdfImgWidth,
          sliceHeight,
          "",
          "FAST"
        );
      }

      pdf.save("Income statement.pdf");
    }, 500); // Delay to allow UI update
  };

  useEffect(() => {
    const fetchIncomeStatement = async () => {
      if (!fromDate || !toDate) return; // Ensure both dates are selected

      try {
        setLoading(true);
        console.log("Fetching income statement from:", fromDate, "to:", toDate);

        const response = await API.get("/reports/income-statement", {
          params: { from_date: fromDate, to_date: toDate },
        });

        console.log("Received response:", response.data);
        setIncomeStatementData(response.data);
      } catch (err) {
        setError("Failed to load income statement data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchIncomeStatement();
  }, [fromDate, toDate]); // Fetch when dates change

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const { revenue, expenses, totalRevenue, totalExpenses, netIncome } =
    incomeStatementData;

  return (
    <div className="max-w-4xl max-h-[calc(100vh-100px)] overflow-y-scroll mx-auto p-6 bg-white shadow rounded-md">
      <h2 className="text-2xl font-bold mb-6">Income Statement</h2>

      {/* Date Range Picker */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-2 p-2 border border-gray-300 rounded w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-2 p-2 border border-gray-300 rounded w-full"
          />
        </div>
        <div className="">
          <button
            onClick={handleDownloadPDF}
            className="px-4 mt-7 py-2 bg-green-500 text-white rounded"
          >
            Print Income Statement
          </button>
        </div>
      </div>
      <div ref={IncomeStatementRef} >
        {/* Revenue Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Revenue</h3>
          <div className="bg-gray-100 p-4 rounded">
            {revenue.length > 0 ? (
              revenue.map((item) => (
                <div
                  key={item.account_name}
                  className="flex justify-between items-center py-2 border-b last:border-b-0"
                >
                  <span>{item.account_name}</span>
                  <span>{formatCurrency(item.amount)}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No revenue recorded.</p>
            )}
          </div>
          <div className="flex justify-between mt-4 font-bold">
            <span>Total Revenue:</span>
            <span>{formatCurrency(totalRevenue)}</span>
          </div>
        </div>

        {/* Expenses Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Expenses</h3>
          <div className="bg-gray-100 p-4 rounded">
            {expenses.length > 0 ? (
              expenses.map((item) => (
                <div
                  key={item.account_name}
                  className="flex justify-between items-center py-2 border-b last:border-b-0"
                >
                  <span>{item.account_name}</span>
                  <span>{formatCurrency(item.amount)}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No expenses recorded.</p>
            )}
          </div>
          <div className="flex justify-between mt-4 font-bold">
            <span>Total Expenses:</span>
            <span>{formatCurrency(totalExpenses)}</span>
          </div>
        </div>

        {/* Net Income */}
        <div
          className={`p-4 rounded font-bold ${
            netIncome >= 0 ? "bg-green-100" : "bg-red-100"
          }`}
        >
          <div className="flex justify-between items-center">
            <span>Net Income:</span>
            <span>{formatCurrency(netIncome)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeStatement;
