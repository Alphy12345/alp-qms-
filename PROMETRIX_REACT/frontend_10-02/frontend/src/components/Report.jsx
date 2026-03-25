import React, { useState, useEffect } from 'react';
import { FileText as ReportIcon, Download, FilePlus, Upload, ChevronLeft, ChevronRight, Palette, Table, Settings, FileSpreadsheet } from 'lucide-react';
import useReportStore from '../store/report';
import useBboxStore from '../store/bbox';
import PDFViewer from './PDFViewer';
import jsPDF from "jspdf";
import { getBalloonedPdfDownloadUrl } from "../store/report";

// ─────────────────────────────────────────────────────────────────
// Helper: fetch ballooned PDF page as PNG using direct API endpoint
// ─────────────────────────────────────────────────────────────────
const fetchBalloonedImageAsBase64 = async (pdfId) => {
  const url = `http://localhost:8000/api/v1/pdf-annotation/pdf/${pdfId}/download-ballooned`;
  const res = await fetch(url, { headers: { accept: 'application/pdf' } });
  if (!res.ok) throw new Error(`Failed to fetch ballooned PDF: ${res.status} ${res.statusText}`);
  const buffer = await res.arrayBuffer();

  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
  const pdfDoc = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 3 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    aspect: canvas.width / canvas.height,
  };
};

const Report = ({
  partData, partId, bomData, logo, setLogo, customFields, notes,
  showReportModal, setShowReportModal,
  showCustomFieldsModal, setShowCustomFieldsModal,
  showLogoModal, setShowLogoModal,
  showStatus
}) => {

  const { pdfData, pdfDimensions, currentPage } = useBboxStore();
  const [tableData, setTableData] = useState([]);
  const [tableHeaders, setTableHeaders] = useState(['ID', 'NOMINAL', 'TOLERANCE', 'TYPE', 'M1', 'M2', 'M3', 'MEAN', 'STATUS']);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, row: null, col: null });

  const handleContextMenu = (e, rowIndex, colIndex) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, row: rowIndex, col: colIndex });
  };
  const closeContextMenu = () => setContextMenu({ visible: false, x: 0, y: 0, row: null, col: null });

  const [isResizingLogo, setIsResizingLogo] = useState(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const handleLogoResizeMouseDown = (e, handle) => {
    e.preventDefault(); e.stopPropagation();
    setIsResizingLogo(handle);
    setResizeStart({ x: e.clientX, y: e.clientY, width: reportCompanyLogoSize.width, height: reportCompanyLogoSize.height });
  };

  const [companyNamePosition, setCompanyNamePosition] = useState({ x: 20, y: 10, isDragging: false });
  const [companyNameDragStart, setCompanyNameDragStart] = useState({ x: 0, y: 0 });
  const [companyNameSize, setCompanyNameSize] = useState({ fontSize: 20, width: 300 });
  const [showNameControls, setShowNameControls] = useState(false);
  const [reportCompanyLogoPosition, setReportCompanyLogoPosition] = useState({ x: 340, y: 10, isDragging: false });
  const [reportCompanyLogoDragStart, setReportCompanyLogoDragStart] = useState({ x: 0, y: 0 });
  const [reportCompanyLogoSize, setReportCompanyLogoSize] = useState({ width: 150, height: 80 });
  const [showLogoControls, setShowLogoControls] = useState(false);

  const handleCompanyNameMouseDown = (e) => {
    e.preventDefault(); e.stopPropagation();
    const el = document.getElementById('report-header');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCompanyNameDragStart({ x: e.clientX - rect.left - companyNamePosition.x, y: e.clientY - rect.top - companyNamePosition.y });
    setCompanyNamePosition(prev => ({ ...prev, isDragging: true }));
  };

  const handleReportCompanyLogoMouseDown = (e) => {
    e.preventDefault(); e.stopPropagation();
    const el = document.getElementById('report-header');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setReportCompanyLogoDragStart({ x: e.clientX - rect.left - reportCompanyLogoPosition.x, y: e.clientY - rect.top - reportCompanyLogoPosition.y });
    setReportCompanyLogoPosition(prev => ({ ...prev, isDragging: true }));
  };

  const [customHeaders, setCustomHeaders] = useState([]);
  const [showCustomHeadersModal, setShowCustomHeadersModal] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [showThemesModal, setShowThemesModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reportZoom, setReportZoom] = useState(1);
  const [reportAlignment, setReportAlignment] = useState('center');
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState(null);
  const [companyLogoPosition, setCompanyLogoPosition] = useState({ x: 20, y: 20, isDragging: false });
  const [companyLogoDragStart, setCompanyLogoDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fn = () => { if (contextMenu.visible) closeContextMenu(); };
    document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, [contextMenu.visible]);

  const reportThemes = {
    default: { name: 'Default Theme', headerBg: '#ffffff', headerBorder: '#000000', titleColor: '#000000', subtitleColor: '#4b5563', sectionBg: '#ffffff', sectionBorder: '#e5e7eb', tableHeaderBg: '#f9fafb', tableHeaderColor: '#374151', tableBorder: '#e5e7eb', footerBg: '#f9fafb', footerColor: '#6b7280' },
    blue: { name: 'Blue Professional', headerBg: '#1e40af', headerBorder: '#1e40af', titleColor: '#ffffff', subtitleColor: '#dbeafe', sectionBg: '#ffffff', sectionBorder: '#3b82f6', tableHeaderBg: '#eff6ff', tableHeaderColor: '#1e40af', tableBorder: '#3b82f6', footerBg: '#f0f9ff', footerColor: '#1e40af' },
    green: { name: 'Green Corporate', headerBg: '#166534', headerBorder: '#166534', titleColor: '#ffffff', subtitleColor: '#dcfce7', sectionBg: '#ffffff', sectionBorder: '#22c55e', tableHeaderBg: '#f0fdf4', tableHeaderColor: '#166534', tableBorder: '#22c55e', footerBg: '#f0fdf4', footerColor: '#166534' },
    purple: { name: 'Purple Modern', headerBg: '#6b21a8', headerBorder: '#6b21a8', titleColor: '#ffffff', subtitleColor: '#f3e8ff', sectionBg: '#ffffff', sectionBorder: '#a855f7', tableHeaderBg: '#faf5ff', tableHeaderColor: '#6b21a8', tableBorder: '#a855f7', footerBg: '#faf5ff', footerColor: '#6b21a8' },
    minimal: { name: 'Minimal Light', headerBg: '#fafafa', headerBorder: '#d1d5db', titleColor: '#374151', subtitleColor: '#6b7280', sectionBg: '#ffffff', sectionBorder: '#e5e7eb', tableHeaderBg: '#f9fafb', tableHeaderColor: '#374151', tableBorder: '#e5e7eb', footerBg: '#f9fafb', footerColor: '#9ca3af' }
  };

  const ThemesModal = () => {
    if (!showThemesModal) return null;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1003, padding: '1rem' }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowThemesModal(false); }}>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', width: '500px', maxWidth: '95vw', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>Choose Report Theme</h3>
          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
            {Object.entries(reportThemes).map(([key, theme]) => (
              <div key={key} onClick={() => setSelectedTheme(key)} style={{ padding: '1rem', border: selectedTheme === key ? '2px solid #3b82f6' : '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: selectedTheme === key ? '#eff6ff' : '#ffffff', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundColor: theme.headerBg, border: `2px solid ${theme.headerBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '20px', height: '20px', backgroundColor: theme.titleColor, borderRadius: '2px' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>{theme.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Professional {key} theme</div>
                  </div>
                  {selectedTheme === key && <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffffff' }} /></div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowThemesModal(false)} style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#ffffff', color: '#374151', fontSize: '0.875rem', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => setShowThemesModal(false)} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', backgroundColor: '#3b82f6', color: '#ffffff', fontSize: '0.875rem', cursor: 'pointer' }}>Apply Theme</button>
          </div>
        </div>
      </div>
    );
  };

  const { reportData, loading: reportLoading, error: reportError, fetchPartReport } = useReportStore();
  const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0, isDragging: false });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reportData?.quantity_reports?.length > 0) {
      const sel = reportData.quantity_reports.find(qr => qr.quantity.toString() === selectedQuantity) || reportData.quantity_reports[0];
      if (sel?.balloons) {
        setTableData(sel.balloons.map(b => ({
          nominal: b.balloon?.nominal || 'N/A',
          tolerance: b.balloon?.utol && b.balloon?.ltol ? `${b.balloon.ltol} / ${b.balloon.utol}` : 'N/A',
          type: b.balloon?.type || 'N/A',
          m1: b.measurements?.[0]?.m1 || 'N/A',
          m2: b.measurements?.[0]?.m2 || 'N/A',
          m3: b.measurements?.[0]?.m3 || 'N/A',
          mean: b.measurements?.[0]?.mean || 'N/A',
          status: b.measurements?.[0]?.go_or_no_go || 'N/A'
        })));
      }
    }
  }, [reportData, selectedQuantity]);

  const handleLogoMouseDown = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    setDragStart({ x: e.clientX - rect.left - logoPosition.x, y: e.clientY - rect.top - logoPosition.y });
    setLogoPosition(prev => ({ ...prev, isDragging: true }));
  };

  const handleCompanyLogoMouseDown = (e) => {
    e.preventDefault(); e.stopPropagation();
    const modal = document.getElementById('custom-headers-modal-content');
    if (!modal) return;
    const rect = modal.getBoundingClientRect();
    setCompanyLogoDragStart({ x: e.clientX - rect.left - companyLogoPosition.x, y: e.clientY - rect.top - companyLogoPosition.y });
    setCompanyLogoPosition(prev => ({ ...prev, isDragging: true }));
  };

  useEffect(() => {
    const onMove = (e) => {
      if (logoPosition.isDragging) {
        const el = document.getElementById('report-header');
        if (el) { const r = el.getBoundingClientRect(); setLogoPosition({ x: Math.max(0, Math.min(e.clientX - r.left - dragStart.x, r.width - 120)), y: Math.max(0, Math.min(e.clientY - r.top - dragStart.y, r.height - 60)), isDragging: true }); }
      }
      if (companyLogoPosition.isDragging) {
        const el = document.getElementById('custom-headers-modal-content');
        if (el) { const r = el.getBoundingClientRect(); setCompanyLogoPosition({ x: Math.max(0, Math.min(e.clientX - r.left - companyLogoDragStart.x, r.width - 150)), y: Math.max(0, Math.min(e.clientY - r.top - companyLogoDragStart.y, r.height - 100)), isDragging: true }); }
      }
      if (companyNamePosition.isDragging) {
        const el = document.getElementById('report-header');
        if (el) { const r = el.getBoundingClientRect(); setCompanyNamePosition({ x: Math.max(0, Math.min(e.clientX - r.left - companyNameDragStart.x, r.width - companyNameSize.width)), y: Math.max(0, Math.min(e.clientY - r.top - companyNameDragStart.y, r.height - 50)), isDragging: true }); }
      }
      if (reportCompanyLogoPosition.isDragging) {
        const el = document.getElementById('report-header');
        if (el) { const r = el.getBoundingClientRect(); setReportCompanyLogoPosition({ x: Math.max(0, Math.min(e.clientX - r.left - reportCompanyLogoDragStart.x, r.width - reportCompanyLogoSize.width)), y: Math.max(0, Math.min(e.clientY - r.top - reportCompanyLogoDragStart.y, r.height - reportCompanyLogoSize.height)), isDragging: true }); }
      }
      if (isResizingLogo) {
        const dx = e.clientX - resizeStart.x, dy = e.clientY - resizeStart.y;
        let w = resizeStart.width, h = resizeStart.height;
        switch (isResizingLogo) {
          case 'se': w = Math.max(50, Math.min(400, w + dx)); h = Math.max(30, Math.min(200, h + dy)); break;
          case 'sw': w = Math.max(50, Math.min(400, w - dx)); h = Math.max(30, Math.min(200, h + dy)); break;
          case 'ne': w = Math.max(50, Math.min(400, w + dx)); h = Math.max(30, Math.min(200, h - dy)); break;
          case 'nw': w = Math.max(50, Math.min(400, w - dx)); h = Math.max(30, Math.min(200, h - dy)); break;
          case 'e': w = Math.max(50, Math.min(400, w + dx)); break;
          case 'w': w = Math.max(50, Math.min(400, w - dx)); break;
          case 'n': h = Math.max(30, Math.min(200, h - dy)); break;
          case 's': h = Math.max(30, Math.min(200, h + dy)); break;
        }
        setReportCompanyLogoSize({ width: w, height: h });
      }
    };
    const onUp = () => {
      if (logoPosition.isDragging) setLogoPosition(p => ({ ...p, isDragging: false }));
      if (companyLogoPosition.isDragging) setCompanyLogoPosition(p => ({ ...p, isDragging: false }));
      if (companyNamePosition.isDragging) setCompanyNamePosition(p => ({ ...p, isDragging: false }));
      if (reportCompanyLogoPosition.isDragging) setReportCompanyLogoPosition(p => ({ ...p, isDragging: false }));
      if (isResizingLogo) setIsResizingLogo(null);
    };
    const active = logoPosition.isDragging || companyLogoPosition.isDragging || companyNamePosition.isDragging || reportCompanyLogoPosition.isDragging || isResizingLogo;
    if (active) { document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); }
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [logoPosition.isDragging, companyLogoPosition.isDragging, dragStart, companyLogoDragStart, companyNamePosition.isDragging, companyNameDragStart, companyNameSize.width, reportCompanyLogoPosition.isDragging, reportCompanyLogoDragStart, reportCompanyLogoSize.width, reportCompanyLogoSize.height, isResizingLogo, resizeStart]);

  useEffect(() => {
    if (reportData?.quantity_reports?.length > 0 && !selectedQuantity) setSelectedQuantity(reportData.quantity_reports[0].quantity.toString());
  }, [reportData, selectedQuantity]);

  useEffect(() => {
    if (showReportModal && partId) fetchPartReport(partId).catch(err => { console.error(err); showStatus('Failed to load report data', 'error'); });
  }, [showReportModal, partId, fetchPartReport, showStatus]);

  // ─────────────────────────────────────────────────────────────────
  // generatePDF - Premium SaaS Enterprise Report Styling
  // ─────────────────────────────────────────────────────────────────
  const generatePDF = async () => {
    try {
      showStatus('Generating PDF...', 'info');
      const { jsPDF } = await import('jspdf');
      const pdfId = reportData?.pdf_id || reportData?.pdfId || reportData?.document_id || reportData?.documentId || reportData?.quantity_reports?.[0]?.pdf_id || reportData?.quantity_reports?.[0]?.pdfId || partData?.document_id || partData?.documentId || partData?.pdf_id || partData?.pdfId;
      
      // A4 page setup with proper margins (20mm top/bottom, 25mm left/right)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginLeft = 25;
      const marginRight = 25;
      const marginTop = 20;
      const marginBottom = 20;
      const contentWidth = pageWidth - marginLeft - marginRight;
      
      let y = marginTop;
      
      // Helper functions
      const addY = (n) => { y += n; };
      const checkPB = (h) => { 
        if (y + h > pageHeight - marginBottom - 10) { 
          pdf.addPage(); 
          y = marginTop; 
        } 
      };
      
      // Set Calibri font throughout
      pdf.setFont('helvetica'); // jsPDF doesn't have Calibri, use Helvetica as closest alternative
      
      // Color constants
      const DARK_NAVY = [30, 42, 58]; // #1E2A3A
      const WHITE = [255, 255, 255];
      const LIGHT_GRAY = [208, 208, 208]; // #D0D0D0
      const GRAY_15 = [232, 232, 232]; // #E8E8E8 (15% gray)
      const GRAY_TEXT = [153, 153, 153]; // #999999
      const ALTERNATE_ROW = [245, 247, 250]; // #F5F7FA
      const BLACK = [0, 0, 0];
      const GO_GREEN = [0, 128, 0];
      const NO_GO_RED = [204, 0, 0];
      
      // Helper to draw section heading
      const drawSectionHeading = (text) => {
        checkPB(12);
        addY(6); // 6pt before spacing
        
        // Full-width dark navy background
        pdf.setFillColor(...DARK_NAVY);
        pdf.rect(marginLeft, y - 4, contentWidth, 8, 'F');
        
        // White bold text, 13pt, all caps
        pdf.setTextColor(...WHITE);
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.text(text.toUpperCase(), marginLeft + 2, y + 1);
        
        addY(8 + 4); // height + 4pt after spacing
      };
      
      // Fetch ballooned image
      let imgData = null, imgAspect = null;
      if (pdfId) { 
        try { 
          const info = await fetchBalloonedImageAsBase64(pdfId); 
          imgData = info.dataUrl; 
          imgAspect = info.aspect; 
        } catch (e) { 
          console.warn(e); 
        } 
      }
      
      // ===== COMPANY HEADER (if provided) =====
      if (companyLogo) { 
        try { 
          pdf.addImage(companyLogo, 'PNG', marginLeft, y - 10, 40, 20); 
        } catch (e) { } 
      }
      
      if (companyName) { 
        pdf.setFontSize(16); 
        pdf.setFont('helvetica', 'bold'); 
        pdf.setTextColor(...BLACK);
        pdf.text(companyName, marginLeft + (companyLogo ? 45 : 0), y + 5, { align: 'left' }); 
      }
      
      if (companyLogo || companyName) {
        addY(20);
        // Light separator line
        pdf.setDrawColor(...LIGHT_GRAY);
        pdf.setLineWidth(0.5);
        pdf.line(marginLeft, y, pageWidth - marginRight, y);
        addY(10);
      }
      
      // ===== PART INFORMATION SECTION =====
      drawSectionHeading('Part Information');
      
      // Part info table - no outer border, inner borders thin light gray
      const piData = [
        ['Part Number:', String(reportData?.part_no || 'N/A')], 
        ['Part Name:', String(reportData?.part_name || 'N/A')], 
        ['Project:', String(reportData?.boc?.project?.name || 'N/A')], 
        ['Quantity:', String(reportData?.boc?.quantity || 'N/A')]
      ];
      
      // Calculate column widths
      const labelColWidth = contentWidth * 0.25; // 25% for label
      const valueColWidth = contentWidth * 0.75; // 75% for value
      const rowHeight = 8; // ~22pt minimum -> 8mm
      
      pdf.setFontSize(10);
      
      piData.forEach(([label, value]) => {
        checkPB(rowHeight + 1);
        
        // Label cell with 15% gray shading
        pdf.setFillColor(...GRAY_15);
        pdf.rect(marginLeft, y, labelColWidth, rowHeight, 'F');
        pdf.setDrawColor(...LIGHT_GRAY);
        pdf.setLineWidth(0.3);
        pdf.rect(marginLeft, y, labelColWidth, rowHeight); // left border
        pdf.line(marginLeft, y + rowHeight, marginLeft + labelColWidth, y + rowHeight); // bottom
        
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...BLACK);
        pdf.text(label, marginLeft + 2, y + 5);
        
        // Value cell (white background)
        pdf.setFillColor(...WHITE);
        pdf.rect(marginLeft + labelColWidth, y, valueColWidth, rowHeight, 'F');
        pdf.rect(marginLeft + labelColWidth, y, valueColWidth, rowHeight); // cell border
        pdf.line(marginLeft + labelColWidth, y + rowHeight, marginLeft + contentWidth, y + rowHeight); // bottom
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, marginLeft + labelColWidth + 2, y + 5);
        
        addY(rowHeight);
      });
      
      // Custom headers if present
      if (customHeaders?.length > 0) {
        addY(5);
        customHeaders.forEach((h) => { 
          if (!h) return;
          checkPB(rowHeight + 1);
          
          const label = String(h.fieldname || '') + ':';
          const value = String(h.value ?? '');
          
          // Label cell
          pdf.setFillColor(...GRAY_15);
          pdf.rect(marginLeft, y, labelColWidth, rowHeight, 'F');
          pdf.setDrawColor(...LIGHT_GRAY);
          pdf.rect(marginLeft, y, labelColWidth, rowHeight);
          pdf.line(marginLeft, y + rowHeight, marginLeft + labelColWidth, y + rowHeight);
          
          pdf.setFont('helvetica', 'bold');
          pdf.text(label, marginLeft + 2, y + 5);
          
          // Value cell
          pdf.setFillColor(...WHITE);
          pdf.rect(marginLeft + labelColWidth, y, valueColWidth, rowHeight, 'F');
          pdf.rect(marginLeft + labelColWidth, y, valueColWidth, rowHeight);
          pdf.line(marginLeft + labelColWidth, y + rowHeight, marginLeft + contentWidth, y + rowHeight);
          
          pdf.setFont('helvetica', 'normal');
          pdf.text(value, marginLeft + labelColWidth + 2, y + 5);
          
          addY(rowHeight);
        });
      }
      
      // Add spacing after table
      addY(10); // 10pt after table
      
      // ===== ENGINEERING DRAWING SECTION =====
      if (imgData && imgAspect) {
        drawSectionHeading('Engineering Drawing');
        
        const maxImgWidth = contentWidth;
        const maxImgHeight = pageHeight - marginBottom - y - 20;
        
        if (maxImgHeight > 30) {
          let imgWidth = maxImgWidth;
          let imgHeight = imgWidth / imgAspect;
          
          if (imgHeight > maxImgHeight) {
            imgHeight = maxImgHeight;
            imgWidth = imgHeight * imgAspect;
          }
          
          const xOffset = marginLeft + (contentWidth - imgWidth) / 2;
          pdf.addImage(imgData, 'PNG', xOffset, y, imgWidth, imgHeight);
          addY(imgHeight + 10);
        }
      }
      
      // ===== INSPECTION DATA SECTION =====
      pdf.addPage();
      y = marginTop;
      
      // Original styling for Inspection Data section
      checkPB(40); 
      pdf.setFontSize(12); 
      pdf.setFont('helvetica', 'bold'); 
      pdf.setTextColor(0, 0, 0); 
      pdf.text('Inspection Data', marginLeft, y); 
      y += 8;
      
      // Original table styling with green header
      const tm = marginLeft;
      const tw2 = contentWidth;
      const cw = [tw2 * 0.04, tw2 * 0.10, tw2 * 0.13, tw2 * 0.18, tw2 * 0.06, tw2 * 0.06, tw2 * 0.06, tw2 * 0.06, tw2 * 0.09];
      const hdrs = ['ID', 'NOMINAL', 'TOLERANCE', 'TYPE', 'M1', 'M2', 'M3', 'MEAN', 'STATUS'];
      
      pdf.setFontSize(9); 
      pdf.setFont('helvetica', 'bold');
      let cx = tm; 
      const hh = 8, rwh = 13;
      
      // Original green header
      hdrs.forEach((h, i) => { 
        pdf.setFillColor(4, 120, 87); 
        pdf.rect(cx, y, cw[i], hh, 'F'); 
        pdf.setDrawColor(0, 0, 0); 
        pdf.setLineWidth(0.5); 
        pdf.rect(cx, y, cw[i], hh); 
        pdf.setTextColor(255, 255, 255); 
        pdf.text(h, cx + cw[i] / 2, y + hh / 2 + 2, { align: 'center' }); 
        cx += cw[i]; 
      });
      
      y += hh; 
      pdf.setFontSize(9); 
      pdf.setFont('helvetica', 'normal');
      
      tableData.forEach((row, idx) => {
        if (y > pageHeight - marginTop - 20) { 
          pdf.addPage(); 
          y = marginTop; 
        }
        
        const vals = [
          String(idx + 1), 
          String(row.nominal || '-').trim(), 
          String(row.tolerance || '-').trim(), 
          String(row.type || '-').trim(), 
          String(row.m1 || '-').trim(), 
          String(row.m2 || '-').trim(), 
          String(row.m3 || '-').trim(), 
          String(row.mean || '-').trim(), 
          String(row.status || '-').trim()
        ];
        
        cx = tm;
        vals.forEach((val, i) => {
          pdf.setFillColor(255, 255, 255); 
          pdf.rect(cx, y, cw[i], rwh, 'F'); 
          pdf.setDrawColor(0, 0, 0); 
          pdf.setLineWidth(0.2); 
          pdf.rect(cx, y, cw[i], rwh);
          
          if (i === 8) { 
            const su = vals[8].toUpperCase(); 
            if (su === 'NO_GO' || su === 'NO-GO' || su === 'NO GO') 
              pdf.setTextColor(255, 0, 0); 
            else if (su === 'GO') 
              pdf.setTextColor(0, 200, 0); 
            else 
              pdf.setTextColor(0, 0, 0); 
          } else { 
            pdf.setTextColor(0, 0, 0); 
          }
          
          pdf.text(val.substring(0, 30), cx + cw[i] / 2, y + rwh / 2 + 2, { align: 'center' }); 
          cx += cw[i];
        });
        
        y += rwh;
      });

      // ===== NOTES SECTION (Original styling) =====
      if (notes?.length > 0) {
        pdf.addPage(); 
        let ny = marginTop;
        pdf.setFontSize(14); 
        pdf.setFont(undefined, 'bold'); 
        pdf.text('Notes', marginLeft, ny); 
        ny += 15;
        pdf.setFontSize(10); 
        pdf.setFont(undefined, 'normal'); 
        let nn = 1;
        
        notes.forEach(note => {
          if (!note.note_text) return;
          note.note_text.replace(/^NOTE:\s*/i, '').trim().split(/\n?\s*\d+\.\s*/).map(i => i.trim()).filter(i => i).forEach(item => {
            const u = item.toUpperCase();
            if (!(u.includes('TO BE') || u.includes('CHAMFER') || u.includes('HARDEN') || u.includes('SURFACE') || u.includes('PEENED') || u.includes('PLATED') || u.includes('SHARP') || u.includes('EDGE') || (item.length > 20 && item.split(' ').length > 4))) return;
            if (ny > pageHeight - marginTop - 30) { pdf.addPage(); ny = marginTop; }
            pdf.setFont(undefined, 'bold'); 
            pdf.text(`${nn}.`, marginLeft, ny); 
            pdf.setFont(undefined, 'normal');
            pdf.splitTextToSize(item, contentWidth - 20).forEach((line, li) => { 
              if (li > 0 && ny > pageHeight - marginTop - 30) { pdf.addPage(); ny = marginTop; } 
              pdf.text(line, marginLeft + 15, ny); 
              if (li < pdf.splitTextToSize(item, contentWidth - 20).length - 1) ny += 6; 
            });
            ny += 12; 
            nn++;
          });
        });
      }

      // ===== ORIGINAL APPROVAL TABLE =====
      const tp = pdf.internal.getNumberOfPages();
      pdf.setPage(tp);
      const fy = pageHeight - 30, fm = 15, fw = pageWidth - 2 * fm;
      const frh = 7, c1 = 30, c2 = 25, c3 = 50, c4 = 35;
      const c5 = fw - c1 - c2 - c3 - c4;
      
      pdf.setFontSize(9); 
      pdf.setTextColor(0, 0, 0); 
      pdf.setDrawColor(0, 0, 0); 
      pdf.setLineWidth(0.4);
      
      // Row 1
      pdf.rect(fm, fy, c1, frh); 
      pdf.setFont(undefined, 'normal'); 
      pdf.text('Prepared:', fm + 3, fy + 5);
      pdf.rect(fm + c1, fy, c2, frh); 
      pdf.text('NH', fm + c1 + 3, fy + 5);
      pdf.rect(fm + c1 + c2, fy, c3, frh * 3);
      pdf.rect(fm + c1 + c2 + c3, fy, c4, frh); 
      pdf.text('Centre /', fm + c1 + c2 + c3 + 3, fy + 3); 
      pdf.text('Group:', fm + c1 + c2 + c3 + 3, fy + 6);
      pdf.rect(fm + c1 + c2 + c3 + c4, fy, c5, frh); 
      pdf.text('C-SMPM/G-SPMA', fm + c1 + c2 + c3 + c4 + 3, fy + 5);
      
      // Row 2
      const r2 = fy + frh;
      pdf.rect(fm, r2, c1, frh); 
      pdf.text('Checked:', fm + 3, r2 + 5);
      pdf.rect(fm + c1, r2, c2, frh); 
      pdf.text('BR', fm + c1 + 3, r2 + 5);
      pdf.rect(fm + c1 + c2 + c3, r2, c4, frh); 
      pdf.text('Ref master', fm + c1 + c2 + c3 + 3, r2 + 3); 
      pdf.text('BOM No:', fm + c1 + c2 + c3 + 3, r2 + 6);
      pdf.rect(fm + c1 + c2 + c3 + c4, r2, c5, frh); 
      pdf.text('BOM-2025-001', fm + c1 + c2 + c3 + c4 + 3, r2 + 5);
      
      // Row 3
      const r3 = r2 + frh;
      pdf.rect(fm, r3, c1, frh); 
      pdf.text('Approved:', fm + 3, r3 + 5);
      pdf.rect(fm + c1, r3, c2, frh); 
      pdf.text('SGK', fm + c1 + 3, r3 + 5);
      pdf.rect(fm + c1 + c2 + c3, r3, c4 + c5, frh);
      
      // Page number
      const pt = `Page ${tp} of ${tp}`; 
      pdf.text(pt, fm + c1 + c2 + c3 + (c4 + c5 - pdf.getTextWidth(pt)) / 2, r3 + 5);
      
      // Draw border on all pages (original style)
      for (let i = 1; i <= tp; i++) { 
        pdf.setPage(i); 
        pdf.setDrawColor(0, 0, 0); 
        pdf.setLineWidth(2); 
        pdf.rect(5, 5, pageWidth - 10, pageHeight - 10); 
      }
      
      // Save PDF
      pdf.save(`Inspection_Report_${partData?.name || 'Direct_Part'}_${new Date().toISOString().split('T')[0]}.pdf`);
      showStatus('PDF downloaded successfully!', 'success');
      setShowReportModal(false);
      
    } catch (error) { 
      console.error(error); 
      showStatus('Error generating PDF: ' + error.message, 'error'); 
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // generateExcel
  // Layout (SINGLE "Inspection Report" sheet):
  //
  //   Cols A–J  →  Title / Part Info / Inspection Data table
  //   Col K     →  spacer
  //   Cols L–S  →  "BALLOONED DRAWING" header + image, anchored
  //               at the same row as the Inspection Data header
  // ─────────────────────────────────────────────────────────────────
  const generateExcel = async () => {
    try {
      showStatus('Generating Excel...', 'info');

      // Dynamic import for ExcelJS
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet('Inspection Report');

      // ── Resolve PDF ID ──────────────────────────────────────────
      const pdfId =
        reportData?.pdf_id || reportData?.pdfId ||
        reportData?.document_id || reportData?.documentId ||
        reportData?.quantity_reports?.[0]?.pdf_id ||
        reportData?.quantity_reports?.[0]?.pdfId ||
        partData?.document_id || partData?.documentId ||
        partData?.pdf_id || partData?.pdfId;

      console.log('[Excel] PDF ID:', pdfId);

      // ── Fetch ballooned drawing ─────────────────────────────────
      let imgId = null;
      if (pdfId) {
        try {
          showStatus('Fetching ballooned drawing...', 'info');
          const info = await fetchBalloonedImageAsBase64(pdfId);
          console.log('[Excel] Image:', info.width, 'x', info.height);
          const b64 = info.dataUrl.replace(/^data:image\/png;base64,/, '');
          const bin = atob(b64);
          const buf = new ArrayBuffer(bin.length);
          const view = new Uint8Array(buf);
          for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
          imgId = workbook.addImage({ buffer: buf, extension: 'png' });
          console.log('[Excel] Image ID:', imgId);
        } catch (e) {
          console.warn('[Excel] Image fetch failed:', e);
          showStatus('Warning: Could not load drawing image', 'warning');
        }
      }

      // ── Column widths ────────────────────────────────────────────
      // A  = spacer, B–J = data table, K = gap, L–S = drawing
      ws.columns = [
        { width: 3 },   // A  spacer
        { width: 20 },  // B  ID
        { width: 14 },  // C  NOMINAL
        { width: 18 },  // D  TOLERANCE
        { width: 20 },  // E  TYPE
        { width: 10 },  // F  M1
        { width: 10 },  // G  M2
        { width: 10 },  // H  M3
        { width: 10 },  // I  MEAN
        { width: 13 },  // J  STATUS
        { width: 3 },   // K  gap
        { width: 14 },  // L  \
        { width: 14 },  // M   |
        { width: 14 },  // N   | drawing area  (~500 px wide total)
        { width: 14 },  // O   |
        { width: 14 },  // P   |
        { width: 14 },  // Q   |
        { width: 14 },  // R  /
      ];

      let row = 1;

      // ── Title ────────────────────────────────────────────────────
      ws.mergeCells(`B${row}:J${row}`);
      Object.assign(ws.getCell(`B${row}`), {
        value: 'INSPECTION REPORT',
        font: { bold: true, size: 18, color: { argb: '1F4E79' }, name: 'Arial' },
        alignment: { horizontal: 'center', vertical: 'middle' }
      });
      ws.getRow(row).height = 32;
      row += 2;

      // ── Part Information ─────────────────────────────────────────
      ws.mergeCells(`B${row}:J${row}`);
      Object.assign(ws.getCell(`B${row}`), {
        value: 'PART INFORMATION',
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' }, name: 'Arial' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      });
      ws.getRow(row).height = 20; row++;

      const piRows = [
        ['Part Number:', String(reportData?.part_no || partData?.name || 'N/A')],
        ['Part Name:', String(reportData?.part_name || partData?.part_name || 'N/A')],
        ['Project:', String(reportData?.boc?.project?.name || bomData?.project?.name || 'N/A')],
        ['Quantity:', String(reportData?.boc?.quantity || 'N/A')],
        ...(customHeaders?.map(h => [String(h.fieldname || h.name) + ':', String(h.value)]) || [])
      ];
      piRows.forEach(([label, value]) => {
        ws.mergeCells(`C${row}:J${row}`);
        const lc = ws.getCell(`B${row}`); lc.value = label; lc.font = { bold: true, size: 11, name: 'Arial' }; lc.alignment = { horizontal: 'left', vertical: 'middle' };
        const vc = ws.getCell(`C${row}`); vc.value = value; vc.font = { size: 11, name: 'Arial' }; vc.alignment = { horizontal: 'left', vertical: 'middle' };
        ws.getRow(row).height = 16; row++;
      });

      row++; // spacing before inspection data

      // ═══════════════════════════════════════════════════════════
      // INSPECTION DATA section — remember start row for image anchor
      // ═══════════════════════════════════════════════════════════
      const inspStartRow = row; // image will be placed at this row, col L

      // Inspection Data section header (left side cols B–J)
      ws.mergeCells(`B${row}:J${row}`);
      Object.assign(ws.getCell(`B${row}`), {
        value: 'INSPECTION DATA',
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' }, name: 'Arial' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      });
      ws.getRow(row).height = 20;

      // "BALLOONED DRAWING" header label (right side cols L–R) — same row
      ws.mergeCells(`L${row}:R${row}`);
      Object.assign(ws.getCell(`L${row}`), {
        value: 'BALLOONED DRAWING',
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' }, name: 'Arial' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '047857' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      });
      row++;

      // Table column headers (B–J)
      const tblHdrs = ['ID', 'NOMINAL', 'TOLERANCE', 'TYPE', 'M1', 'M2', 'M3', 'MEAN', 'STATUS'];
      tblHdrs.forEach((h, i) => {
        const c = ws.getCell(String.fromCharCode(66 + i) + row);
        c.value = h;
        c.font = { bold: true, size: 11, color: { argb: 'FFFFFF' }, name: 'Arial' };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '047857' } };
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        c.border = { top: { style: 'thin', color: { argb: 'D9D9D9' } }, left: { style: 'thin', color: { argb: 'D9D9D9' } }, bottom: { style: 'thin', color: { argb: 'D9D9D9' } }, right: { style: 'thin', color: { argb: 'D9D9D9' } } };
      });
      ws.getRow(row).height = 20; row++;

      // Table data rows
      tableData.forEach((rowData, idx) => {
        const vals = [idx + 1, rowData.nominal || '-', rowData.tolerance || '-', rowData.type || '-', rowData.m1 || '-', rowData.m2 || '-', rowData.m3 || '-', rowData.mean || '-', rowData.status || '-'];
        vals.forEach((val, ci) => {
          const c = ws.getCell(String.fromCharCode(66 + ci) + row);
          c.value = val;
          c.font = { size: 10, name: 'Arial' };
          c.alignment = { horizontal: 'center', vertical: 'middle' };
          if (ci === 8) {
            const su = String(val).toUpperCase();
            if (su === 'NO_GO' || su === 'NO-GO' || su === 'NO GO') {
              c.font = { size: 10, name: 'Arial', color: { argb: 'CC0000' }, bold: true };
              c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E5' } };
            } else if (su === 'GO') {
              c.font = { size: 10, name: 'Arial', color: { argb: '006400' }, bold: true };
              c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E5FFE5' } };
            } else {
              c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFFFFF' : 'F9FAFB' } };
            }
          } else {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFFFFF' : 'F9FAFB' } };
          }
          c.border = { top: { style: 'thin', color: { argb: 'D9D9D9' } }, left: { style: 'thin', color: { argb: 'D9D9D9' } }, bottom: { style: 'thin', color: { argb: 'D9D9D9' } }, right: { style: 'thin', color: { argb: 'D9D9D9' } } };
        });
        ws.getRow(row).height = 16; row++;
      });

      const inspEndRow = row - 1;

      // ── Place image RIGHT of table (cols L–R, same rows as inspection section) ──
      if (imgId !== null) {
        // How many rows does the table span?
        const spanRows = inspEndRow - inspStartRow + 1;
        // Each row ≈ 18px; minimum 400px tall; max 600px
        const imgH = Math.min(600, Math.max(400, spanRows * 18));
        const imgW = 500; // fits neatly across cols L–R

        ws.addImage(imgId, {
          // tl: top-left corner. col 11 = col L (0-indexed), row = inspStartRow + 1 (0-indexed = inspStartRow)
          tl: { col: 11, row: inspStartRow },
          ext: { width: imgW, height: imgH },
          editAs: 'oneCell'
        });
        console.log('[Excel] Image placed at col L, row', inspStartRow + 1, ', size', imgW, 'x', imgH);
      } else {
        // Placeholder
        ws.mergeCells(`L${inspStartRow + 1}:R${inspStartRow + 3}`);
        const ph = ws.getCell(`L${inspStartRow + 1}`);
        ph.value = 'Ballooned drawing could not be loaded. Check PDF ID or network.';
        ph.font = { italic: true, size: 11, color: { argb: 'CC0000' }, name: 'Arial' };
        ph.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
      }

      // ── Notes ────────────────────────────────────────────────────
      if (notes?.length > 0) {
        row += 2;
        ws.mergeCells(`B${row}:J${row}`);
        Object.assign(ws.getCell(`B${row}`), { value: 'NOTES', font: { bold: true, size: 12, color: { argb: 'FFFFFF' }, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } }, alignment: { horizontal: 'center', vertical: 'middle' } });
        ws.getRow(row).height = 20; row += 2;
        let nn = 1;
        notes.forEach(note => {
          if (!note.note_text) return;
          note.note_text.replace(/^NOTE:\s*/i, '').trim().split(/\n?\s*\d+\.\s*/).map(i => i.trim()).filter(i => i).forEach(item => {
            const u = item.toUpperCase();
            if (!(u.includes('TO BE') || u.includes('CHAMFER') || u.includes('HARDEN') || u.includes('SURFACE') || u.includes('PEENED') || u.includes('PLATED') || u.includes('SHARP') || u.includes('EDGE') || (item.length > 20 && item.split(' ').length > 4))) return;
            ws.mergeCells(`C${row}:J${row}`);
            ws.getCell(`B${row}`).value = `${nn}.`; ws.getCell(`B${row}`).font = { bold: true, size: 10, name: 'Arial' }; ws.getCell(`B${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
            ws.getCell(`C${row}`).value = item; ws.getCell(`C${row}`).font = { size: 10, name: 'Arial' }; ws.getCell(`C${row}`).alignment = { wrapText: true };
            ws.getRow(row).height = 16; row++; nn++;
          });
        });
      }

      // ── Download ─────────────────────────────────────────────────
      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inspection_report_${partData?.name || 'report'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showStatus('Excel downloaded successfully!', 'success');
    } catch (error) {
      console.error('[Excel] Error:', error);
      showStatus('Error generating Excel: ' + error.message, 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // CustomHeadersModal
  // ─────────────────────────────────────────────────────────────────
  const CustomHeadersModal = () => {
    if (!showCustomHeadersModal) return null;
    const handleLogoUpload = (e) => {
      const file = e.target.files[0]; if (!file) return;
      if (!file.type.startsWith('image/')) { showStatus('Please upload an image file', 'error'); return; }
      if (file.size > 5 * 1024 * 1024) { showStatus('Image size should be less than 5MB', 'error'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => { setCompanyLogo(ev.target.result); showStatus('Logo uploaded!', 'success'); };
      reader.readAsDataURL(file);
    };
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '1rem' }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowCustomHeadersModal(false); }}>
        <div id="custom-headers-modal-content" style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', width: '600px', maxWidth: '95vw', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>Report Header Configuration</h3>

          {/* Preview */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Report Header Preview</label>
            <div style={{ border: '2px dashed #d1d5db', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff', minHeight: '120px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textAlign: 'center', marginBottom: '0.5rem' }}>Drag logo and company name to position them</div>
              {companyName && (
                <div style={{ position: 'absolute', left: `${companyNamePosition.x}px`, top: `${companyNamePosition.y + 30}px`, fontSize: `${companyNameSize.fontSize}px`, width: `${companyNameSize.width}px`, padding: '0.5rem', border: companyNamePosition.isDragging ? '2px dashed #3b82f6' : '2px solid #e5e7eb', borderRadius: '6px', backgroundColor: companyNamePosition.isDragging ? '#eff6ff' : '#fafafa', cursor: companyNamePosition.isDragging ? 'grabbing' : 'grab', zIndex: companyNamePosition.isDragging ? 1000 : 1 }}
                  onMouseDown={handleCompanyNameMouseDown}>{companyName}</div>
              )}
              {companyLogo && (
                <div style={{ position: 'absolute', left: `${companyLogoPosition.x}px`, top: `${companyLogoPosition.y + 30}px`, width: '150px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', border: companyLogoPosition.isDragging ? '2px dashed #3b82f6' : '2px solid #e5e7eb', borderRadius: '6px', cursor: companyLogoPosition.isDragging ? 'grabbing' : 'grab', zIndex: companyLogoPosition.isDragging ? 1000 : 2 }}
                  onMouseDown={handleCompanyLogoMouseDown}>
                  <img src={companyLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                </div>
              )}
              {!companyName && !companyLogo && <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem', padding: '2rem' }}>Add company name and/or logo below to preview</div>}
            </div>
          </div>

          {/* Company Name */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company Name</label>
            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Enter your company name"
              style={{ width: '100%', padding: '0.75rem', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#d1d5db'} />
          </div>

          {/* Company Logo */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company Logo</label>
            <input type="file" accept="image/*" onChange={handleLogoUpload}
              style={{ width: '100%', padding: '0.75rem', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }} />
          </div>

          {/* Custom Headers */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Custom Headers</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input type="text" id="newHeaderFieldname" placeholder="Fieldname" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', flex: 1 }} />
              <input type="text" id="newHeaderValue" placeholder="Header value" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', flex: 1 }} />
              <button onClick={() => { const fi = document.getElementById('newHeaderFieldname'), vi = document.getElementById('newHeaderValue'); if (fi.value.trim() && vi.value.trim()) { setCustomHeaders([...customHeaders, { name: fi.value.trim(), fieldname: fi.value.trim(), value: vi.value.trim() }]); fi.value = ''; vi.value = ''; showStatus('Header added!', 'success'); } }}
                style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', backgroundColor: '#3b82f6', color: '#ffffff', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
            </div>
            {customHeaders.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Added Headers ({customHeaders.length}):</div>
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {customHeaders.map((h, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#ffffff', borderRadius: '4px', marginBottom: '0.5rem', border: '1px solid #e5e7eb' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.125rem' }}>{h.name}</div>
                        <div style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.fieldname ? `${h.fieldname}: ` : ''}{h.value}</div>
                      </div>
                      <button onClick={() => { setCustomHeaders(customHeaders.filter((_, j) => j !== i)); showStatus('Header removed', 'info'); }}
                        style={{ padding: '0.25rem 0.5rem', border: '1px solid #ef4444', borderRadius: '4px', backgroundColor: '#ffffff', color: '#ef4444', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', marginLeft: '0.5rem', flexShrink: 0 }}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
            <button onClick={() => { setShowCustomHeadersModal(false); showStatus('Header configured!', 'success'); }}
              style={{ padding: '0.75rem 2rem', border: 'none', borderRadius: '6px', backgroundColor: '#10b981', color: '#ffffff', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase' }}
              onMouseOver={(e) => { e.target.style.backgroundColor = '#059669'; }} onMouseOut={(e) => { e.target.style.backgroundColor = '#10b981'; }}>Done</button>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────
  // ContextMenu
  // ─────────────────────────────────────────────────────────────────
  const ContextMenu = () => {
    if (!contextMenu.visible) return null;
    const items = [
      { label: 'Add Column Before', action: 'addColumnBefore', divider: false }, { label: 'Add Column After', action: 'addColumnAfter', divider: true },
      { label: 'Delete Column Before', action: 'deleteColumnBefore', divider: false }, { label: 'Delete Column After', action: 'deleteColumnAfter', divider: false }, { label: 'Delete Column', action: 'deleteColumn', divider: true },
      { label: 'Add Row Before', action: 'addRowBefore', divider: false }, { label: 'Add Row After', action: 'addRowAfter', divider: true },
      { label: 'Delete Row Before', action: 'deleteRowBefore', divider: false }, { label: 'Delete Row After', action: 'deleteRowAfter', divider: false }, { label: 'Delete Row', action: 'deleteRow', divider: true },
      { label: 'Import Data', action: 'importData', divider: false }, { label: 'Change column name', action: 'changeColumnName', divider: true },
      { label: 'Go', action: 'setGo', divider: false }, { label: 'No-Go', action: 'setNoGo', divider: false }, { label: 'Remove Go/No-Go', action: 'removeGoNoGo', divider: false }
    ];
    const keys = ['nominal', 'tolerance', 'type', 'm1', 'm2', 'm3', 'mean', 'status'];
    const emptyRow = () => { const r = {}; tableHeaders.forEach((_, i) => { r[i < keys.length ? keys[i] : `col_${i}`] = 'N/A'; }); return r; };
    const handle = (action) => {
      const { row, col } = contextMenu;
      switch (action) {
        case 'addColumnBefore': case 'addColumnAfter': setTableHeaders([...tableHeaders, `Col ${tableHeaders.length + 1}`]); setTableData(tableData.map(r => ({ ...r, [`col_${tableHeaders.length}`]: 'N/A' }))); showStatus('Column added', 'success'); break;
        case 'deleteColumnBefore': if (col > 0) { setTableHeaders(tableHeaders.filter((_, i) => i !== col - 1)); showStatus('Column before deleted', 'success'); } break;
        case 'deleteColumnAfter': if (col < tableHeaders.length - 1) { setTableHeaders(tableHeaders.filter((_, i) => i !== col + 1)); showStatus('Column after deleted', 'success'); } break;
        case 'deleteColumn': if (col !== null) { setTableHeaders(tableHeaders.filter((_, i) => i !== col)); showStatus('Column deleted', 'success'); } break;
        case 'addRowBefore': if (row !== null) { const d = [...tableData]; d.splice(row, 0, emptyRow()); setTableData(d); showStatus('Row added', 'success'); } break;
        case 'addRowAfter': if (row !== null) { setTableData([...tableData, emptyRow()]); showStatus('Row added', 'success'); } break;
        case 'deleteRowBefore': if (row > 0) { setTableData(tableData.filter((_, i) => i !== row - 1)); showStatus('Row deleted', 'success'); } break;
        case 'deleteRowAfter': if (row < tableData.length - 1) { setTableData(tableData.filter((_, i) => i !== row + 1)); showStatus('Row deleted', 'success'); } break;
        case 'deleteRow': if (row !== null) { setTableData(tableData.filter((_, i) => i !== row)); showStatus('Row deleted', 'success'); } break;
        case 'importData': showStatus('Import data - coming soon', 'info'); break;
        case 'changeColumnName': if (col !== null) { const n = prompt('New column name:', tableHeaders[col]); if (n?.trim()) { const h = [...tableHeaders]; h[col] = n.trim(); setTableHeaders(h); showStatus('Column renamed', 'success'); } } break;
        case 'setGo': if (row !== null) { const d = [...tableData]; d[row].status = 'GO'; setTableData(d); showStatus('Status: GO', 'success'); } break;
        case 'setNoGo': if (row !== null) { const d = [...tableData]; d[row].status = 'NO-GO'; setTableData(d); showStatus('Status: NO-GO', 'success'); } break;
        case 'removeGoNoGo': if (row !== null) { const d = [...tableData]; d[row].status = 'N/A'; setTableData(d); showStatus('Status cleared', 'success'); } break;
        default: break;
      }
      closeContextMenu();
    };
    return (
      <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 1000, minWidth: '200px', maxHeight: '400px', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
        {items.map((item, i) => (
          <React.Fragment key={i}>
            <div onClick={() => handle(item.action)} style={{ padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.875rem', color: '#374151' }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}>{item.label}</div>
            {item.divider && i < items.length - 1 && <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '0.25rem 0' }} />}
          </React.Fragment>
        ))}
      </div>
    );
  };

  if (!showReportModal) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget) setShowReportModal(false); }}>
      <div style={{ backgroundColor: '#f5f5f5', borderRadius: '8px', padding: '1.5rem', width: '1200px', maxWidth: '95vw', height: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative', display: 'flex', gap: '1rem' }}>

        {/* ── SIDEBAR ── */}
        <div style={{ width: sidebarCollapsed ? '60px' : '320px', backgroundColor: '#ffffff', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'width 0.3s ease', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '2px solid #000000' }}>
          <div style={{ borderBottom: '2px solid #000000', paddingBottom: '1rem', marginTop: '1rem' }}>
            {!sidebarCollapsed && <h3 style={{ color: '#000000', fontSize: '1.125rem', fontWeight: '700', margin: 0, textAlign: 'center' }}>REPORT CONTROLS</h3>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            {!sidebarCollapsed && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setShowCustomHeadersModal(true)}
                  style={{ padding: '0.5rem', border: '2px solid #000000', borderRadius: '6px', backgroundColor: '#ffffff', color: '#000000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '40px' }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#000000'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.color = '#000000'; }}
                  title="Custom Headers"><FilePlus size={14} /></button>
                {reportData?.quantity_reports?.length > 0 && (
                  <div style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: '6px', border: '2px solid #000000', padding: '0.5rem' }}>
                    <select value={selectedQuantity} onChange={(e) => setSelectedQuantity(e.target.value)}
                      style={{ width: '100%', padding: '0.375rem', border: '1px solid #000000', borderRadius: '4px', backgroundColor: '#ffffff', color: '#000000', fontSize: '0.75rem', cursor: 'pointer' }}>
                      <option value="">All Qty</option>
                      {reportData.quantity_reports.map((qr, i) => <option key={i} value={qr.quantity}>Qty{qr.quantity}</option>)}
                      <option value="consolidate">consolidate</option>
                    </select>
                  </div>
                )}
              </div>
            )}
            <div style={{ flex: 1 }} />
            {!sidebarCollapsed && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={generatePDF} style={{ padding: '0.4rem 0.8rem', border: '1px solid #3b82f6', borderRadius: '4px', backgroundColor: '#3b82f6', color: '#ffffff', fontSize: '0.7rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}><Download size={12} /><span>Download</span></button>
                <button onClick={generateExcel} style={{ padding: '0.4rem 0.8rem', border: '1px solid #10b981', borderRadius: '4px', backgroundColor: '#10b981', color: '#ffffff', fontSize: '0.7rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}><FileSpreadsheet size={12} /><span>Excel</span></button>
                <button onClick={() => setShowReportModal(false)} style={{ padding: '0.4rem 0.8rem', border: '1px solid #ef4444', borderRadius: '4px', backgroundColor: '#ef4444', color: '#ffffff', fontSize: '0.7rem', fontWeight: '500', cursor: 'pointer' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}>Close</button>
              </div>
            )}
            {sidebarCollapsed && (
              <>
                <button onClick={generatePDF} style={{ padding: '0.625rem', border: '2px solid #000000', borderRadius: '6px', backgroundColor: '#000000', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Download size={16} /></button>
                <button onClick={generateExcel} style={{ padding: '0.625rem', border: '2px solid #10b981', borderRadius: '6px', backgroundColor: '#10b981', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileSpreadsheet size={16} /></button>
                <button onClick={() => setShowReportModal(false)} style={{ padding: '0.625rem', border: '2px solid #000000', borderRadius: '6px', backgroundColor: '#ffffff', color: '#000000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </>
            )}
          </div>
        </div>

        {/* ── A4 SHEET ── */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
          <div style={{ backgroundColor: 'white', width: '794px', minHeight: '1123px', margin: '0 auto', border: '3px solid #000000', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transform: `scale(${reportZoom})`, transformOrigin: reportAlignment === 'left' ? 'top left' : reportAlignment === 'right' ? 'top right' : 'top center', transition: 'transform 0.2s ease' }}>

            {/* Report Header */}
            <div id="report-header" style={{ borderBottom: `2px solid ${reportThemes[selectedTheme].headerBorder}`, padding: '1.5rem', backgroundColor: reportThemes[selectedTheme].headerBg, minHeight: logo || customFields.length > 0 || companyName || companyLogo ? '180px' : '100px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', minHeight: '80px' }}>
                {companyName && (
                  <div style={{ position: 'absolute', left: `${companyNamePosition.x}px`, top: `${companyNamePosition.y}px`, width: `${companyNameSize.width}px`, padding: '0.5rem', border: companyNamePosition.isDragging ? '2px dashed #3b82f6' : showNameControls ? '2px solid #3b82f6' : '2px solid transparent', borderRadius: '6px', backgroundColor: companyNamePosition.isDragging ? '#eff6ff' : showNameControls ? '#f0f9ff' : 'transparent', cursor: companyNamePosition.isDragging ? 'grabbing' : 'grab', zIndex: companyNamePosition.isDragging ? 1000 : (showNameControls ? 999 : 2) }}
                    onMouseDown={handleCompanyNameMouseDown} onMouseEnter={() => setShowNameControls(true)} onMouseLeave={() => setShowNameControls(false)}>
                    <div style={{ fontSize: `${companyNameSize.fontSize}px`, fontWeight: '700', color: reportThemes[selectedTheme].titleColor, textTransform: 'uppercase', pointerEvents: 'none', userSelect: 'none' }}>{companyName}</div>
                    {showNameControls && (
                      <div style={{ position: 'absolute', bottom: '-30px', left: 0, display: 'flex', gap: '0.25rem', backgroundColor: '#ffffff', padding: '0.25rem', borderRadius: '4px', border: '1px solid #d1d5db', zIndex: 1001 }}
                        onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                        <button onClick={(e) => { e.stopPropagation(); setCompanyNameSize(p => ({ ...p, fontSize: Math.max(10, p.fontSize - 2) })); }} style={{ padding: '0.25rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '3px', backgroundColor: '#fff', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '600' }}>A-</button>
                        <button onClick={(e) => { e.stopPropagation(); setCompanyNameSize(p => ({ ...p, fontSize: Math.min(48, p.fontSize + 2) })); }} style={{ padding: '0.25rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '3px', backgroundColor: '#fff', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '600' }}>A+</button>
                        <button onClick={(e) => { e.stopPropagation(); setCompanyNameSize(p => ({ ...p, width: Math.max(100, p.width - 20) })); }} style={{ padding: '0.25rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '3px', backgroundColor: '#fff', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '600' }}>◄</button>
                        <button onClick={(e) => { e.stopPropagation(); setCompanyNameSize(p => ({ ...p, width: Math.min(600, p.width + 20) })); }} style={{ padding: '0.25rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '3px', backgroundColor: '#fff', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '600' }}>►</button>
                      </div>
                    )}
                  </div>
                )}
                {companyLogo && (
                  <div style={{ position: 'absolute', left: `${reportCompanyLogoPosition.x}px`, top: `${reportCompanyLogoPosition.y}px`, width: `${reportCompanyLogoSize.width}px`, height: `${reportCompanyLogoSize.height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', border: reportCompanyLogoPosition.isDragging ? '2px dashed #3b82f6' : showLogoControls ? '2px solid #3b82f6' : '2px solid #e5e7eb', borderRadius: '6px', cursor: reportCompanyLogoPosition.isDragging ? 'grabbing' : 'grab', zIndex: reportCompanyLogoPosition.isDragging ? 1000 : (showLogoControls ? 999 : 2) }}
                    onMouseDown={handleReportCompanyLogoMouseDown} onMouseEnter={() => setShowLogoControls(true)} onMouseLeave={() => setShowLogoControls(false)}>
                    <img src={companyLogo} alt="Company Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                    {showLogoControls && (
                      <>
                        <div style={{ position: 'absolute', bottom: '-30px', left: 0, display: 'flex', gap: '0.25rem', backgroundColor: '#ffffff', padding: '0.25rem', borderRadius: '4px', border: '1px solid #d1d5db', zIndex: 1001 }}
                          onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                          <button onClick={(e) => { e.stopPropagation(); setReportCompanyLogoSize(p => ({ width: Math.max(50, p.width - 10), height: Math.max(30, p.height - 6) })); }} style={{ padding: '0.25rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '3px', backgroundColor: '#fff', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '600' }}>-</button>
                          <button onClick={(e) => { e.stopPropagation(); setReportCompanyLogoSize(p => ({ width: Math.min(400, p.width + 10), height: Math.min(200, p.height + 6) })); }} style={{ padding: '0.25rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '3px', backgroundColor: '#fff', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '600' }}>+</button>
                        </div>
                        {['nw', 'ne', 'sw', 'se'].map(h => (
                          <div key={h} style={{ position: 'absolute', top: h.includes('n') ? '-4px' : 'auto', bottom: h.includes('s') ? '-4px' : 'auto', left: h.includes('w') ? '-4px' : 'auto', right: h.includes('e') ? '-4px' : 'auto', width: '8px', height: '8px', backgroundColor: '#3b82f6', border: '1px solid white', borderRadius: '50%', cursor: `${h}-resize`, zIndex: 1002 }}
                            onMouseDown={(e) => handleLogoResizeMouseDown(e, h)} />
                        ))}
                      </>
                    )}
                  </div>
                )}
                {logo && (
                  <div style={{ position: 'absolute', left: `${logoPosition.x}px`, top: `${logoPosition.y}px`, width: '120px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', border: logoPosition.isDragging ? '2px dashed #3b82f6' : '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: logoPosition.isDragging ? '#eff6ff' : '#fafafa', cursor: logoPosition.isDragging ? 'grabbing' : 'grab', zIndex: logoPosition.isDragging ? 1000 : 1 }}
                    onMouseDown={handleLogoMouseDown}>
                    <img src={logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                  </div>
                )}
                <div style={{ flex: 1, zIndex: 0 }} /><div style={{ width: '120px' }} />
              </div>
              {customFields.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: customFields.length === 1 ? '1fr' : customFields.length === 2 ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #d1d5db' }}>
                  {customFields.map(f => (
                    <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', padding: '0.5rem', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.name}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', wordBreak: 'break-word' }}>{f.value || '-'}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 3 }}>
                {logo && <button onClick={() => setLogoPosition({ x: 0, y: 0, isDragging: false })} style={{ padding: '0.25rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#ffffff', color: '#6b7280', fontSize: '0.625rem', cursor: 'pointer', fontWeight: '600' }}>Reset Logo</button>}
              </div>
            </div>

            {/* Report Content */}
            <div style={{ flex: 1, padding: '1.5rem', overflow: 'auto' }}>
              {reportLoading && <div style={{ textAlign: 'center', padding: '3rem' }}><div style={{ width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} /><div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading report data...</div></div>}
              {reportError && <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}><div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Error loading report</div><div style={{ fontSize: '0.875rem' }}>{reportError}</div></div>}
              {!reportLoading && !reportError && reportData && (
                <div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '700', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.025em', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem' }}>Part Information</h3>
                    <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${4 + customHeaders.length}, 1fr)`, gap: '1rem' }}>
                        {[['PART NUMBER', reportData.part_no], ['PART NAME', reportData.part_name], ['PROJECT', reportData.boc?.project?.name], ['QTY', reportData.boc?.quantity], ...customHeaders.map(h => [h.name.toUpperCase(), h.value])].map(([label, value], i) => (
                          <div key={i}><div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>{label}</div><div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>{value || 'N/A'}</div></div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {pdfData && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '700', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.025em', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem' }}>Part Drawing</h3>
                      <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        <PDFViewer pdfData={pdfData} pdfDimensions={pdfDimensions} currentPage={currentPage || 1} scale={1.2} boundingBoxes={useBboxStore.getState().boundingBoxes} notes={[]} isSelectionMode={false} isPanMode={false} isNotesMode={false} isStampMode={false} rotation={0} />
                      </div>
                    </div>
                  )}
                  <div style={{ pageBreakAfter: 'always', marginBottom: '2rem', height: '20px' }} />
                  {tableData.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.025em', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                        <span>Inspection Data</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#3b82f6', textTransform: 'none' }}>{selectedQuantity === '' ? 'All Qty' : selectedQuantity === 'consolidate' ? 'consolidate' : `Qty${selectedQuantity}`}</span>
                        {isEditing && <span style={{ fontSize: '0.75rem', color: '#059669' }}>(Editing - Right-click for options)</span>}
                      </h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden', fontSize: '0.75rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            {tableHeaders.map((h, ci) => <th key={ci} onContextMenu={(e) => isEditing && handleContextMenu(e, null, ci)} style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb', borderRight: '1px solid #e5e7eb', fontSize: '0.7rem', textTransform: 'uppercase', cursor: isEditing ? 'context-menu' : 'default' }}>{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.map((row, ri) => (
                            <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? 'white' : '#fafafa' }}>
                              {tableHeaders.map((h, ci) => {
                                const ks = ['id', 'nominal', 'tolerance', 'type', 'm1', 'm2', 'm3', 'mean', 'status'];
                                const ck = ks[ci]; const cv = ci === 0 ? (ri + 1).toString() : (row[ck] || 'N/A');
                                return (
                                  <td key={ci} onContextMenu={(e) => isEditing && handleContextMenu(e, ri, ci)}
                                    style={{ padding: '0.5rem', color: '#374151', borderBottom: '1px solid #e5e7eb', borderRight: ci === tableHeaders.length - 1 ? 'none' : '1px solid #e5e7eb', textAlign: ci >= 3 && ci <= 6 ? 'center' : 'left', cursor: isEditing ? 'context-menu' : 'default' }}
                                    contentEditable={isEditing && ci !== 8} suppressContentEditableWarning
                                    onBlur={(e) => { if (isEditing && ci !== 8) { const nd = [...tableData]; nd[ri][ck] = e.currentTarget.textContent; setTableData(nd); } }}>
                                    {ci === 8 ? <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600', backgroundColor: cv === 'GO' ? '#d1fae5' : cv === 'NO-GO' ? '#fee2e2' : '#f3f4f6', color: cv === 'GO' ? '#065f46' : cv === 'NO-GO' ? '#991b1b' : '#6b7280', display: 'inline-block' }}>{cv}</span> : cv}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ borderTop: '2px solid #000000', padding: '1rem 1.5rem', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#6b7280' }}>
              <span>Generated on {new Date().toLocaleDateString()}</span>
              <span>{partData.name || 'Direct Part'}</span>
            </div>
          </div>
        </div>
      </div>

      {CustomHeadersModal()}
      {ThemesModal()}
      {ContextMenu()}
    </div>
  );
};

export default Report;
