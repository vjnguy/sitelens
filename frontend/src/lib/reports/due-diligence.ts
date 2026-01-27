/**
 * Due Diligence Report Generator
 *
 * Generates comprehensive property analysis reports
 */

import type { SiteAnalysis, IdentifyResult, PropertyInfo } from '@/lib/api/qld-identify';

export interface ReportSection {
  title: string;
  content: string | string[];
  severity?: 'high' | 'medium' | 'low' | 'info';
}

export interface DueDiligenceReport {
  generatedAt: Date;
  property: PropertyInfo | null;
  coordinates: [number, number];
  sections: ReportSection[];
  summary: {
    totalConstraints: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
    recommendation: string;
  };
  constraints: IdentifyResult[];
  mapSnapshot?: string; // Base64 data URL of map image
}

/**
 * Format area for display
 */
function formatArea(sqm: number): string {
  if (sqm >= 10000) {
    return `${(sqm / 10000).toFixed(2)} hectares`;
  }
  return `${sqm.toLocaleString()} square metres`;
}

/**
 * Get severity recommendation
 */
function getSeverityRecommendation(high: number, medium: number): string {
  if (high > 2) {
    return 'This site has multiple high-impact constraints that may significantly affect development potential. Professional planning and environmental advice is strongly recommended before proceeding.';
  } else if (high > 0) {
    return 'This site has high-impact constraints that require careful consideration. Specialist advice should be sought to understand implications for development.';
  } else if (medium > 2) {
    return 'This site has several medium-impact constraints that may affect development options. Further investigation is recommended.';
  } else if (medium > 0) {
    return 'This site has some constraints that should be considered during planning. Standard due diligence processes should be adequate.';
  }
  return 'This site has minimal identified constraints. Standard due diligence processes should be followed.';
}

/**
 * Capture map as base64 image
 * Requires map to have preserveDrawingBuffer: true
 */
export function captureMapSnapshot(map: mapboxgl.Map | null): string | undefined {
  if (!map) return undefined;

  try {
    const canvas = map.getCanvas();
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('Could not capture map snapshot:', err);
    return undefined;
  }
}

/**
 * Generate a due diligence report from site analysis
 */
export function generateDueDiligenceReport(analysis: SiteAnalysis, mapSnapshot?: string): DueDiligenceReport {
  const sections: ReportSection[] = [];

  // Property Details Section
  if (analysis.property) {
    sections.push({
      title: 'Property Details',
      content: [
        `Lot/Plan: ${analysis.property.lotPlan}`,
        `Locality: ${analysis.property.locality || 'Not specified'}`,
        `Local Government Area: ${analysis.property.lga || 'Not specified'}`,
        `Land Area: ${analysis.property.area > 0 ? formatArea(analysis.property.area) : 'Not available'}`,
        `Tenure: ${analysis.property.tenure || 'Not specified'}`,
        `Parcel Type: ${analysis.property.parcelType || 'Not specified'}`,
      ],
    });
  }

  // Location Section
  sections.push({
    title: 'Location',
    content: [
      `Coordinates: ${analysis.coordinates[1].toFixed(6)}°S, ${analysis.coordinates[0].toFixed(6)}°E`,
      `Analysis Date: ${analysis.timestamp.toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`,
    ],
  });

  // Group constraints by category
  const constraintsByCategory = analysis.constraints.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {} as Record<string, IdentifyResult[]>);

  // Heritage Constraints
  const heritageConstraints = constraintsByCategory['Heritage'] || [];
  if (heritageConstraints.length > 0) {
    sections.push({
      title: 'Heritage Constraints',
      severity: 'high',
      content: heritageConstraints.map(c => {
        const attrs = c.attributes[0] || {};
        return `${c.layerName}: ${attrs.NAME || attrs.PLACE_NAME || 'Identified'}`;
      }),
    });
  } else {
    sections.push({
      title: 'Heritage Constraints',
      severity: 'info',
      content: 'No heritage constraints identified at this location.',
    });
  }

  // Environmental Constraints
  const envConstraints = constraintsByCategory['Environment'] || [];
  if (envConstraints.length > 0) {
    sections.push({
      title: 'Environmental Constraints',
      severity: envConstraints.some(c => c.severity === 'high') ? 'high' : 'medium',
      content: envConstraints.map(c => {
        const severityLabel = c.severity === 'high' ? '[HIGH]' : c.severity === 'medium' ? '[MEDIUM]' : '';
        return `${severityLabel} ${c.layerName}`;
      }),
    });
  } else {
    sections.push({
      title: 'Environmental Constraints',
      severity: 'info',
      content: 'No environmental constraints identified at this location.',
    });
  }

  // Hazard Constraints
  const hazardConstraints = constraintsByCategory['Hazards'] || [];
  if (hazardConstraints.length > 0) {
    sections.push({
      title: 'Natural Hazards',
      severity: 'high',
      content: hazardConstraints.map(c => {
        const attrs = c.attributes[0] || {};
        return `${c.layerName}: ${attrs.CATEGORY || attrs.HAZARD_LEVEL || 'Identified'}`;
      }),
    });
  } else {
    sections.push({
      title: 'Natural Hazards',
      severity: 'info',
      content: 'No natural hazard overlays identified at this location.',
    });
  }

  // Infrastructure Constraints
  const infraConstraints = constraintsByCategory['Infrastructure'] || [];
  if (infraConstraints.length > 0) {
    sections.push({
      title: 'Infrastructure',
      severity: 'medium',
      content: infraConstraints.map(c => c.layerName),
    });
  }

  // Calculate summary
  const highSeverity = analysis.constraints.filter(c => c.severity === 'high').length;
  const mediumSeverity = analysis.constraints.filter(c => c.severity === 'medium').length;
  const lowSeverity = analysis.constraints.filter(c => c.severity === 'low').length;

  return {
    generatedAt: new Date(),
    property: analysis.property,
    coordinates: analysis.coordinates,
    sections,
    summary: {
      totalConstraints: analysis.constraints.length,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      recommendation: getSeverityRecommendation(highSeverity, mediumSeverity),
    },
    constraints: analysis.constraints,
    mapSnapshot,
  };
}

/**
 * Generate HTML content for the report (for PDF generation or display)
 */
export function generateReportHTML(report: DueDiligenceReport): string {
  const severityColors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#3b82f6',
    info: '#6b7280',
  };

  const sectionsHTML = report.sections.map(section => {
    const severityColor = section.severity ? severityColors[section.severity] : '#000';
    const content = Array.isArray(section.content)
      ? `<ul>${section.content.map(item => `<li>${item}</li>`).join('')}</ul>`
      : `<p>${section.content}</p>`;

    return `
      <div class="section" style="margin-bottom: 20px; border-left: 4px solid ${severityColor}; padding-left: 16px;">
        <h3 style="margin: 0 0 8px 0; color: ${severityColor};">${section.title}</h3>
        ${content}
      </div>
    `;
  }).join('');

  const mapImageHTML = report.mapSnapshot ? `
    <div class="map-section" style="margin: 20px 0;">
      <h2>Site Location</h2>
      <img src="${report.mapSnapshot}" alt="Site Map" style="width: 100%; max-width: 600px; border: 1px solid #e5e7eb; border-radius: 8px;" />
      <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">
        Coordinates: ${report.coordinates[1].toFixed(6)}°S, ${report.coordinates[0].toFixed(6)}°E
      </p>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Due Diligence Report - ${report.property?.lotPlan || 'Site Analysis'}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
        h2 { color: #374151; }
        h3 { font-size: 1.1em; }
        ul { margin: 0; padding-left: 20px; }
        li { margin: 4px 0; }
        .summary { background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 8px; }
        .badge-high { background: #fecaca; color: #991b1b; }
        .badge-medium { background: #fed7aa; color: #9a3412; }
        .badge-low { background: #bfdbfe; color: #1e40af; }
        .map-section { page-break-inside: avoid; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        @media print {
          body { padding: 0; }
          .map-section img { max-width: 100%; }
        }
      </style>
    </head>
    <body>
      <h1>Due Diligence Report</h1>
      <p><strong>Property:</strong> ${report.property?.lotPlan || 'Unknown'}</p>
      <p><strong>Generated:</strong> ${report.generatedAt.toLocaleString('en-AU')}</p>

      ${mapImageHTML}

      <div class="summary">
        <h2>Constraint Summary</h2>
        <p>
          <span class="badge badge-high">${report.summary.highSeverity} High</span>
          <span class="badge badge-medium">${report.summary.mediumSeverity} Medium</span>
          <span class="badge badge-low">${report.summary.lowSeverity} Low</span>
        </p>
        <p><strong>Recommendation:</strong> ${report.summary.recommendation}</p>
      </div>

      ${sectionsHTML}

      <div class="footer">
        <p>This report is generated from Queensland Government spatial data and is provided for informational purposes only.
        Always verify information with relevant authorities before making decisions.</p>
        <p>Generated by Siteora - ${report.generatedAt.toISOString()}</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate report as downloadable text/markdown
 */
export function generateReportMarkdown(report: DueDiligenceReport): string {
  const lines: string[] = [];

  lines.push('# Due Diligence Report');
  lines.push('');
  lines.push(`**Property:** ${report.property?.lotPlan || 'Unknown'}`);
  lines.push(`**Generated:** ${report.generatedAt.toLocaleString('en-AU')}`);
  lines.push(`**Coordinates:** ${report.coordinates[1].toFixed(6)}, ${report.coordinates[0].toFixed(6)}`);
  lines.push('');

  lines.push('## Constraint Summary');
  lines.push('');
  lines.push(`- **High Severity:** ${report.summary.highSeverity}`);
  lines.push(`- **Medium Severity:** ${report.summary.mediumSeverity}`);
  lines.push(`- **Low Severity:** ${report.summary.lowSeverity}`);
  lines.push(`- **Total:** ${report.summary.totalConstraints}`);
  lines.push('');
  lines.push(`**Recommendation:** ${report.summary.recommendation}`);
  lines.push('');

  report.sections.forEach(section => {
    const severityLabel = section.severity ? ` [${section.severity.toUpperCase()}]` : '';
    lines.push(`## ${section.title}${severityLabel}`);
    lines.push('');

    if (Array.isArray(section.content)) {
      section.content.forEach(item => {
        lines.push(`- ${item}`);
      });
    } else {
      lines.push(section.content);
    }
    lines.push('');
  });

  lines.push('---');
  lines.push('');
  lines.push('*This report is generated from Queensland Government spatial data and is provided for informational purposes only.*');
  lines.push('');
  lines.push(`*Generated by Siteora - ${report.generatedAt.toISOString()}*`);

  return lines.join('\n');
}

/**
 * Download report as file
 */
export function downloadReport(report: DueDiligenceReport, format: 'html' | 'md' | 'json' = 'html'): void {
  let content: string;
  let mimeType: string;
  let extension: string;

  switch (format) {
    case 'html':
      content = generateReportHTML(report);
      mimeType = 'text/html';
      extension = 'html';
      break;
    case 'md':
      content = generateReportMarkdown(report);
      mimeType = 'text/markdown';
      extension = 'md';
      break;
    case 'json':
      content = JSON.stringify(report, null, 2);
      mimeType = 'application/json';
      extension = 'json';
      break;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `due-diligence-${report.property?.lotPlan || 'report'}-${report.generatedAt.toISOString().split('T')[0]}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Open report in new window for printing
 */
export function printReport(report: DueDiligenceReport): void {
  const html = generateReportHTML(report);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
