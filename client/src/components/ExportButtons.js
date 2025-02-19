import React from 'react';
import { Button, ButtonGroup, Menu, MenuItem } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import GetAppIcon from '@mui/icons-material/GetApp';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const ExportButtons = ({ data, filename, columns }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text(filename, 14, 20);

    const tableData = data.map(item => 
      columns.map(col => item[col.field]?.toString() || '')
    );

    doc.autoTable({
      head: [columns.map(col => col.headerName)],
      body: tableData,
      startY: 30,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    doc.save(`${filename}.pdf`);
    handleClose();
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data.map(item => {
      const row = {};
      columns.forEach(col => {
        row[col.headerName] = item[col.field];
      });
      return row;
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(dataBlob, `${filename}.xlsx`);
    handleClose();
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`${filename}\n\n${data.map(item => 
      columns.map(col => `${col.headerName}: ${item[col.field]}`).join('\n')
    ).join('\n\n')}`);
    window.open(`https://wa.me/?text=${text}`);
    handleClose();
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(filename);
    const body = encodeURIComponent(data.map(item => 
      columns.map(col => `${col.headerName}: ${item[col.field]}`).join('\n')
    ).join('\n\n'));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    handleClose();
  };

  return (
    <>
      <ButtonGroup variant="contained" size="small">
        <Button
          startIcon={<GetAppIcon />}
          onClick={() => exportToPDF()}
        >
          PDF
        </Button>
        <Button
          onClick={() => exportToExcel()}
        >
          Excel
        </Button>
        <Button
          startIcon={<ShareIcon />}
          onClick={handleClick}
        >
          שתף
        </Button>
      </ButtonGroup>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={shareViaWhatsApp}>WhatsApp</MenuItem>
        <MenuItem onClick={shareViaEmail}>אימייל</MenuItem>
      </Menu>
    </>
  );
};

export default ExportButtons;
