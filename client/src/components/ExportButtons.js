import React from 'react';
import { Button, ButtonGroup, Menu, MenuItem, Table, TableHead, TableBody, TableRow, TableCell, Paper } from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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

  // פונקציה להמרת ערכים לפורמט המתאים
  const formatValue = (value, field) => {
    if (!value) return '';
    
    // טיפול בתאריכים
    if (field === 'due_date' || field === 'date') {
      try {
        const date = new Date(value);
        return date.toLocaleDateString('he-IL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      } catch (e) {
        return value;
      }
    }
    
    // טיפול בסטטוס
    if (field === 'status') {
      const statusMap = {
        'TODO': 'לביצוע',
        'IN_PROGRESS': 'בתהליך',
        'DONE': 'הושלם',
        'pending': 'ממתין',
        'completed': 'הושלם'
      };
      return statusMap[value] || value;
    }

    // טיפול במערכים (כמו תתי-משימות)
    if (Array.isArray(value)) {
      if (field === 'subtasks') {
        return value.map((subtask, idx) => 
          `${idx + 1}. ${subtask.title || subtask}`
        ).join('\\n');
      }
      return value.join(', ');
    }

    // טיפול בבוליאנים
    if (typeof value === 'boolean') {
      return value ? 'כן' : 'לא';
    }

    return value.toString();
  };

  const exportToPDF = async () => {
    // יצירת טבלה זמנית עם הנתונים
    const tempTable = document.createElement('div');
    tempTable.style.direction = 'rtl';
    tempTable.style.fontFamily = 'Heebo, Arial, sans-serif';
    tempTable.style.padding = '20px';
    tempTable.innerHTML = `
      <h2 style="text-align: center; margin-bottom: 20px;">${filename}</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            ${columns.map(col => `
              <th style="
                background-color: #428bca;
                color: white;
                padding: 12px;
                text-align: right;
                border: 1px solid #ddd;
                font-size: 14px;
              ">${col.headerName}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${data && data.length > 0 ? data.map(item => `
            <tr>
              ${columns.map(col => `
                <td style="
                  padding: 8px;
                  text-align: right;
                  border: 1px solid #ddd;
                  font-size: 12px;
                  white-space: pre-line;
                ">${formatValue(item[col.field], col.field)}</td>
              `).join('')}
            </tr>
          `).join('') : '<tr><td colspan="' + columns.length + '" style="text-align: center; padding: 10px;">אין נתונים להצגה</td></tr>'}
        </tbody>
      </table>
    `;

    document.body.appendChild(tempTable);

    try {
      // יצירת תמונה מהטבלה
      const canvas = await html2canvas(tempTable, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: tempTable.scrollWidth,
        windowHeight: tempTable.scrollHeight
      });

      // יצירת PDF
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      let heightLeft = imgHeight;
      let position = 0;
      let pageNumber = 1;

      // הוספת התמונה לPDF
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // הוספת עמודים נוספים אם צריך
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        pageNumber++;
      }

      doc.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      // ניקוי הטבלה הזמנית
      document.body.removeChild(tempTable);
    }

    handleClose();
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data.map(item => {
      const row = {};
      columns.forEach(col => {
        row[col.headerName] = formatValue(item[col.field], col.field);
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
      </Menu>
    </div>
  );
};

export default ExportButtons;
