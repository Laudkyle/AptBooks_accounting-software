const printInvoice = () => {
    // Change input type to text to remove arrows
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach((input) => {
      input.setAttribute("type", " ");
    });

    // Open a new window with no UI elements, fullscreen
    const printWindow = window.open("", "", "width=1920,height=1080");

    // Get the content of the current invoice (or clone it for printing)
    const invoiceContent = document.querySelector(
      ".invoice-modal-content"
    ).outerHTML;

    // Create a <style> tag to ensure styles are included in the print window
    const styles = `
      <style>
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
  }

  .invoice-modal-content {
    padding: 20px;
  }

  table {
    width: 100%;
    table-layout: auto;
    border-collapse: collapse;
    margin-bottom:20px;
  }

  th, td {
    padding: 10px;
    text-align: left;
    border: 1px solid #ddd; /* Horizontal lines */
  }

  th {
    background-color: #f4f4f4;
  }

  /* Shading even rows */
  tr:nth-child(even) {
    background-color: #f9f9f9;
  }

  .print-only {
    display: none;
  }

  input[type="text"] {
    -webkit-appearance: none;
    appearance: none;
  }

  @media print {
    body {
      width: 100%;
      margin: 0;
    }
    
    /* Ensuring horizontal lines are visible in print */
    table {
      border: 1px solid black;
    }

    th, td {
      border-top: 1px solid black;
      border-bottom: 1px solid black;
    }

    /* Ensure the even row shading persists in print */
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }

    .print-only {
      display: none;
    }
      .invoice-summary {
      text-align:right;
      }
      .sub{
      font-size:22px;
      font-weight:600;
      margin-bottom:10px;

      }
      .grand{
      font-size:24px;
      font-weight:700;
      margin-top:10px;

      }
         @page {
      size: auto;
      margin: 0;
    }

    /* Remove any page headers or footers */
    html, body {
      padding: 0;
      margin: 0;
    }
  }
</style>

    `;

    // Write the invoice content and styles into the new window
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice</title>
          ${styles} <!-- Add the inline styles here -->
        </head>
        <body>
          ${invoiceContent} <!-- Add the invoice content -->
        </body>
      </html>
    `);

    // Wait for the content to be fully loaded, then print
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };

    // Restore the input type back to number after print (if necessary)
    inputs.forEach((input) => {
      input.setAttribute("type", "number");
    });
  };
  export default printInvoice