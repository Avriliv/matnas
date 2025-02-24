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
    // יצירת מסמך PDF עם תמיכה בעברית
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true,
      direction: 'rtl'
    });

    // הוספת פונט עברי
    doc.addFont('https://fonts.gstatic.com/s/heebo/v21/NGSpv5_NC0k9P_v6ZUCbLRAHxK1EiSysdUmj.ttf', 'Heebo', 'normal');
    doc.setFont('Heebo');
    doc.setFontSize(14);
    
    // כותרת בעברית
    const title = filename;
    const titleWidth = doc.getStringUnitWidth(title) * doc.getFontSize();
    const pageWidth = doc.internal.pageSize.getWidth();
    const titleX = (pageWidth - titleWidth) / 2;
    doc.text(title, titleX, 20);

    // הכנת נתונים לטבלה
    const tableData = data.map(item => 
      columns.map(col => {
        const value = item[col.field];
        return value?.toString() || '';
      })
    );

    // יצירת טבלה עם תמיכה בעברית
    doc.autoTable({
      head: [columns.map(col => col.headerName)],
      body: tableData,
      startY: 30,
      theme: 'grid',
      styles: {
        font: 'Heebo',
        fontSize: 10,
        cellPadding: 3,
        halign: 'right',
        direction: 'rtl'
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: [255, 255, 255],
        halign: 'right'
      },
      columnStyles: {
        0: { halign: 'right' }
      },
      didParseCell: function(data) {
        // הפיכת טקסט בעברית לכיוון הנכון
        const hebrew = /[\u0590-\u05FF]/.test(data.text);
        if (hebrew) {
          data.cell.styles.direction = 'rtl';
        }
      }
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
    XLSX.utils.book_append_sheet(wb, ws, filename);
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const excelFile = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(excelFile, `${filename}.xlsx`);
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
    <div>
      <ButtonGroup variant="contained" color="primary">
        <Button
          startIcon={<GetAppIcon />}
          onClick={handleClick}
        >
          ייצא
        </Button>
      </ButtonGroup>
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={() => exportToPDF()}>
          ייצא ל-PDF
        </MenuItem>
        <MenuItem onClick={() => exportToExcel()}>
          ייצא ל-Excel
        </MenuItem>
        <MenuItem onClick={shareViaWhatsApp}>WhatsApp</MenuItem>
        <MenuItem onClick={shareViaEmail}>אימייל</MenuItem>
      </Menu>
    </div>
  );
};

export default ExportButtons;
